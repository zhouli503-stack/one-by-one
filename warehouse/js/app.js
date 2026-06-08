// ============================================================
// 售后库房管理系统 - 主应用逻辑
// Vue 3 + Supabase
// ============================================================
const { createApp, ref, computed, onMounted } = Vue;

const app = createApp({
  setup() {
    const supabase = window.supabase?.createClient(
      window.SUPABASE_CONFIG?.supabaseUrl || '',
      window.SUPABASE_CONFIG?.supabaseAnonKey || '',
      { auth: { autoRefreshToken: true, persistSession: true } }
    );

    // ===== 状态 =====
    const page = ref('loading');
    const loggedIn = ref(false);
    const saving = ref(false);
    const mobileView = ref(window.innerWidth < 768);
    const showNav = ref(false);
    const profile = ref(null);
    const toast = ref({ show:false, message:'', type:'info' });
    let toastTimer = null;

    // 数据
    const items = ref([]);
    const transactions = ref([]);
    const userList = ref([]);

    // 搜索/筛选
    const itemSearch = ref('');
    const recordSearch = ref('');
    const recordType = ref('');

    // 出入库表单
    const transItem = ref('');
    const transType = ref('');
    const transQty = ref(1);
    const transHandler = ref('');
    const transPurpose = ref('');
    const transNotes = ref('');
    const transError = ref('');

    // 物品表单
    const showItemForm = ref(false);
    const editingItem = ref(null);
    const itemForm = ref({ name:'', code:'', description:'', requester:'', total_qty:0, available_qty:0, location:'', category:'', unit:'' });

    // 盘点
    const invActual = ref({});
    const invNotes = ref({});
    const invMsg = ref('');
    const invMsgType = ref('');

    const roleName = computed(() => {
      const m = { user:'普通用户', admin:'管理员', super_admin:'超级管理员' };
      return m[profile.value?.role] || '用户';
    });

    const stats = computed(() => ({
      totalItems: items.value.length,
      totalQty: items.value.reduce((s,i) => s + i.total_qty, 0),
      availableQty: items.value.reduce((s,i) => s + i.available_qty, 0),
      todayOps: transactions.value.filter(t => t.created_at?.startsWith(new Date().toISOString().slice(0,10))).length
    }));

    const menu = [
      { id:'dashboard', label:'仪表盘', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>' },
      { id:'items', label:'库存列表', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' },
      { id:'transaction', label:'出入库登记', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>' },
      { id:'records', label:'操作记录', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
      { id:'inventory', label:'库存盘点', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' },
    ];

    const filteredItems = computed(() => {
      const q = itemSearch.value.toLowerCase();
      if (!q) return items.value;
      return items.value.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        (i.requester||'').toLowerCase().includes(q)
      );
    });

    const typeLabel = t => ({ new:'新增', lend:'借出', return:'归还', scrap:'报废' }[t] || t);

    function itemName(id) {
      const it = items.value.find(i => i.id === id);
      return it?.name || '未知';
    }

    const filteredRecords = computed(() => {
      let list = [...transactions.value];
      if (recordSearch.value) {
        const q = recordSearch.value.toLowerCase();
        list = list.filter(r => itemName(r.item_id).toLowerCase().includes(q));
      }
      if (recordType.value) {
        list = list.filter(r => r.type === recordType.value);
      }
      return list;
    });

    function showToast(msg, type='info') {
      if (toastTimer) clearTimeout(toastTimer);
      toast.value = { show:true, message:msg, type };
      toastTimer = setTimeout(() => toast.value.show = false, 3000);
    }

    function toggleMobile() {
      mobileView.value = !mobileView.value;
      showNav.value = false;
    }

    // 监听窗口尺寸
    window.addEventListener('resize', () => {
      mobileView.value = window.innerWidth < 768;
    });

    // ===== 数据加载 =====
    async function loadItems() {
      const { data } = await supabase.from('warehouse_items').select('*').order('id');
      if (data) items.value = data;
    }

    async function loadTransactions() {
      const { data } = await supabase.from('warehouse_transactions').select('*').order('created_at', { ascending: false });
      if (data) {
        // 联表查询操作人姓名
        const userIds = [...new Set(data.map(t => t.operator_id))];
        const { data: users } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
        const userMap = {};
        if (users) users.forEach(u => userMap[u.id] = u.full_name);
        data.forEach(t => t.operator_name = userMap[t.operator_id] || '未知');
        transactions.value = data;
      }
    }

    async function loadAll() {
      await Promise.all([loadItems(), loadTransactions()]);
    }

    // ===== 物品 CRUD =====
    function openItemForm(it) {
      if (it) {
        editingItem.value = it;
        itemForm.value = {
          name: it.name, code: it.code, description: it.description || '',
          requester: it.requester || '', total_qty: it.total_qty, available_qty: it.available_qty,
          location: it.location || '', category: it.category || '', unit: it.unit || ''
        };
      } else {
        editingItem.value = null;
        itemForm.value = { name:'', code:'', description:'', requester:'', total_qty:0, available_qty:0, location:'', category:'', unit:'' };
      }
      showItemForm.value = true;
    }

    async function saveItem() {
      const f = itemForm.value;
      if (!f.name || !f.code) { showToast('请填写名称和编码', 'error'); return; }
      saving.value = true;
      try {
        if (editingItem.value) {
          await supabase.from('warehouse_items').update(f).eq('id', editingItem.value.id);
          showToast('已更新', 'success');
        } else {
          const { data } = await supabase.from('warehouse_items').insert(f).select();
          if (data && data[0]) {
            // 新增同时生成操作记录
            await supabase.from('warehouse_transactions').insert({
              item_id: data[0].id,
              type: 'new',
              quantity: f.total_qty,
              handler: f.requester || '',
              purpose: '新增物品',
              notes: `初始入库 ${f.total_qty} ${f.unit||'个'}`,
              operator_id: profile.value?.id
            });
          }
          showToast('已添加', 'success');
        }
        showItemForm.value = false;
        await loadAll();
      } catch (err) { showToast(err.message || '操作失败', 'error'); }
      finally { saving.value = false; }
    }

    async function deleteItem(id) {
      if (!confirm('确定报废该物品？此操作不可撤销。')) return;
      saving.value = true;
      try {
        const item = items.value.find(i => i.id === id);
        if (item && item.available_qty > 0) {
          // 报废时生成操作记录
          await supabase.from('warehouse_transactions').insert({
            item_id: id,
            type: 'scrap',
            quantity: item.available_qty,
            handler: item.requester || '',
            purpose: '报废',
            notes: `报废 ${item.name}（${item.code}），数量 ${item.available_qty}`,
            operator_id: profile.value?.id
          });
        }
        await supabase.from('warehouse_items').delete().eq('id', id);
        showToast('已删除', 'success');
        await loadAll();
      } catch (err) { showToast(err.message || '删除失败', 'error'); }
      finally { saving.value = false; }
    }

    // ===== 借出/归还登记 =====
    async function submitTransaction() {
      transError.value = '';
      if (!transItem.value) { transError.value = '请选择物品'; return; }
      if (!transType.value) { transError.value = '请选择操作类型'; return; }
      if (!transQty.value || transQty.value < 1) { transError.value = '请输入有效数量'; return; }

      const item = items.value.find(i => i.id === transItem.value);
      if (!item) return;

      // 借出时检查库存
      if (transType.value === 'lend' && transQty.value > item.available_qty) {
        transError.value = `库存不足！当前可用 ${item.available_qty}，需要 ${transQty.value}`;
        return;
      }

      saving.value = true;
      try {
        const delta = transType.value === 'lend' ? -transQty.value : transQty.value;

        // 写入操作记录
        await supabase.from('warehouse_transactions').insert({
          item_id: transItem.value,
          type: transType.value,
          quantity: transQty.value,
          handler: transHandler.value || '',
          purpose: transPurpose.value || '',
          notes: transNotes.value || '',
          operator_id: profile.value?.id
        });

        // 更新库存（借出/归还不影响 total_qty）
        await supabase.from('warehouse_items').update({
          available_qty: item.available_qty + delta
        }).eq('id', transItem.value);

        showToast('登记成功', 'success');
        // 重置表单
        transItem.value = ''; transType.value = ''; transQty.value = 1;
        transHandler.value = ''; transPurpose.value = ''; transNotes.value = '';
        await loadAll();
      } catch (err) { showToast(err.message || '操作失败', 'error'); }
      finally { saving.value = false; }
    }

    // ===== 库存盘点 =====
    async function submitInventory() {
      const records = [];
      let hasDiff = false;
      for (const it of items.value) {
        const actual = invActual.value[it.id];
        if (actual === undefined || actual === null || actual === '') continue;
        const diff = actual - it.available_qty;
        if (diff !== 0) {
          hasDiff = true;
          records.push({
            item_id: it.id,
            expected_qty: it.available_qty,
            actual_qty: actual,
            difference: diff,
            notes: invNotes.value[it.id] || '',
            checker_id: profile.value?.id
          });
        }
      }

      if (!hasDiff) {
        invMsg.value = '所有物品账面与实盘一致，无需调整';
        invMsgType.value = 'success';
        return;
      }

      saving.value = true;
      try {
        // 写入盘点记录
        for (const rec of records) {
          await supabase.from('warehouse_inventory_records').insert(rec);
          // 更新账面库存
          await supabase.from('warehouse_items').update({
            available_qty: rec.actual_qty,
            total_qty: rec.difference > 0 ? rec.actual_qty + (items.value.find(i=>i.id===rec.item_id)?.total_qty||0) : rec.actual_qty
          }).eq('id', rec.item_id);
        }
        invMsg.value = `盘点完成，${records.length} 项有差异已修正`;
        invMsgType.value = 'success';
        await loadItems();
      } catch (err) { showToast(err.message || '盘点失败', 'error'); }
      finally { saving.value = false; }
    }

    // ===== 初始化 =====
    onMounted(async () => {
      try {
        const { data: { session } } = await supabase?.auth?.getSession();
        if (session?.user) {
          const { data } = await supabase.rpc('get_my_profile');
          if (data) {
            profile.value = data;
            loggedIn.value = true;
            await loadAll();
            page.value = 'dashboard';
            return;
          }
        }
      } catch(e) { console.warn(e); }
      // 未登录，跳转回 portal
      window.location.href = '../portal/index.html';
    });

    return {
      page, loggedIn, saving, mobileView, showNav, profile, toast,
      items, transactions, userList,
      itemSearch, recordSearch, recordType,
      transItem, transType, transQty, transHandler, transPurpose, transNotes, transError,
      showItemForm, editingItem, itemForm,
      invActual, invNotes, invMsg, invMsgType,
      roleName, stats, menu, filteredItems, filteredRecords,
      typeLabel, itemName,
      showToast, toggleMobile,
      openItemForm, saveItem, deleteItem,
      submitTransaction,
      submitInventory
    };
  }
});
app.mount('#app');
