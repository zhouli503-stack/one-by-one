// ============================================================
// 演示预约系统 - 主应用逻辑
// Vue 3 + Supabase + FullCalendar
// ============================================================
const { createApp, ref, computed, onMounted, nextTick } = Vue;

const app = createApp({
  setup() {
    const supabase = window.supabase?.createClient(
      window.SUPABASE_CONFIG?.supabaseUrl || '',
      window.SUPABASE_CONFIG?.supabaseAnonKey || '',
      { auth: { autoRefreshToken: true, persistSession: true } }
    );
    const toEmail = n => (n||'').toLowerCase().trim() + (window.SUPABASE_CONFIG?.internalDomain||'@booking.tea-pulse.cn');

    // ===== 状态 =====
    const page = ref('loading');
    const loading = ref(false);
    const saving = ref(false);
    const authLoading = ref(false);
    const authError = ref('');
    const sidebarCollapsed = ref(false);
    const viewMode = ref('desktop');
    const showMobileNav = ref(false);
    const user = ref(null);
    const userProfile = ref(null);
    const userList = ref([]);
    const toast = ref({ show:false, message:'', type:'info' });
    const tooltipData = ref({ show:false, x:0, y:0, content:'' });
    let toastTimer = null;
    let calendarInstance = null;

    const loginForm = ref({ login_name:'', password:'' });
    const regForm = ref({ login_name:'', password:'', full_name:'', employee_id:'', department:'', division:'', region:'' });

    // 数据
    const equipmentList = ref([]);
    const equipmentUnits = ref([]);
    const personnel = ref([]);
    const personnelAssignments = ref([]);
    const myReservations = ref([]);
    const expandedEquipmentId = ref(null);

    // 资产表单（独立资产，不分设备类型）
    const showEquipmentForm = ref(false);
    const editingEquipment = ref(null);
    const eqForm = ref({ name:'', serial_no:'', params:'', accessories:'', custodian:'', location:'', notes:'' });

    // 人员表单
    const showPersonnelForm = ref(false);
    const personnelForm = ref({ name:'' });
    const editingPersonnelId = ref(null);

    // 任务表单
    const showTaskForm = ref(false);
    const taskPersonId = ref(null);
    const taskPersonName = ref('');
    const taskForm = ref({ start_date:'', end_date:'', task_description:'' });

    // 预约表单
    const showBookingModal = ref(false);
    const bookingDate = ref('');
    const bookingStart = ref('');
    const bookingEnd = ref('');
    const bookingCountry = ref('');
    const bookingPurpose = ref('');
    const bookingLoading = ref(false);
    const bookingEquipmentSel = ref({});  // { eqId: quantity }
    const bookingPersonnelSel = ref([]);  // [personId]

    // 国家
    const countryList = ['中国','尼日利亚','赞比亚','阿尔及利亚','乍得','乌干达','埃塞俄比亚','沙特阿拉伯','马来西亚','印度尼西亚','安哥拉','莫桑比克','肯尼亚','坦桑尼亚','加纳','刚果(金)','刚果(布)','赤道几内亚','加蓬','利比亚','埃及','伊拉克','伊朗','阿联酋','卡塔尔','南非','南苏丹','苏丹','摩洛哥','突尼斯','塞内加尔','科特迪瓦','马里','布基纳法索','贝宁','尼日尔','多哥','塞拉利昂','利比里亚','几内亚','几内亚比绍','冈比亚','佛得角','圣多美和普林西比','毛里塔尼亚','西撒哈拉','吉布提','厄立特里亚','索马里','卢旺达','布隆迪','马拉维','津巴布韦','博茨瓦纳','纳米比亚','斯威士兰','莱索托','马达加斯加','科摩罗','毛里求斯','塞舌尔','英国','法国','德国','意大利','西班牙','葡萄牙','荷兰','比利时','瑞士','奥地利','瑞典','挪威','丹麦','芬兰','冰岛','爱尔兰','波兰','捷克','斯洛伐克','匈牙利','罗马尼亚','保加利亚','塞尔维亚','克罗地亚','波黑','斯洛文尼亚','北马其顿','黑山','阿尔巴尼亚','希腊','土耳其','塞浦路斯','马耳他','卢森堡','列支敦士登','安道尔','摩纳哥','圣马力诺','梵蒂冈','立陶宛','拉脱维亚','爱沙尼亚','白俄罗斯','乌克兰','摩尔多瓦','俄罗斯','格鲁吉亚','亚美尼亚','阿塞拜疆','哈萨克斯坦','乌兹别克斯坦','土库曼斯坦','吉尔吉斯斯坦','塔吉克斯坦','蒙古','韩国','朝鲜','日本','菲律宾','越南','老挝','柬埔寨','缅甸','泰国','新加坡','文莱','东帝汶','孟加拉国','印度','巴基斯坦','斯里兰卡','马尔代夫','尼泊尔','不丹','阿富汗','美国','加拿大','墨西哥','危地马拉','伯利兹','萨尔瓦多','洪都拉斯','尼加拉瓜','哥斯达黎加','巴拿马','古巴','牙买加','海地','多米尼加','巴哈马','巴巴多斯','特立尼达和多巴哥','格林纳达','圣卢西亚','圣文森特和格林纳丁斯','多米尼克','安提瓜和巴布达','圣基茨和尼维斯','哥伦比亚','委内瑞拉','圭亚那','苏里南','厄瓜多尔','秘鲁','巴西','玻利维亚','巴拉圭','乌拉圭','阿根廷','智利','澳大利亚','新西兰','巴布亚新几内亚','斐济','所罗门群岛','瓦努阿图','萨摩亚','汤加','基里巴斯','密克罗尼西亚','马绍尔群岛','帕劳','瑙鲁','图瓦卢'];

    // ===== 计算属性 =====
    const isLoggedIn = computed(() => !!user.value);
    const isAdmin = computed(() => ['admin','super_admin'].includes(userProfile.value?.role));
    const roleLabel = computed(() => {
      const m = { user:'普通用户', admin:'管理员', super_admin:'超级管理员' };
      return m[userProfile.value?.role] || '未知';
    });

    const dashboardStats = computed(() => ({
      totalEquipment: equipmentList.value.length,
      myReservations: myReservations.value.length
    }));

    const menuItems = computed(() => {
      const items = [
        { id:'dashboard', label:'仪表盘', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>' },
        { id:'calendar', label:'预约日历', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
        { id:'my-reservations', label:'我的预约', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
      ];
      if (isAdmin.value) {
        items.push({ id:'equipment', label:'设备管理', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' });
        items.push({ id:'personnel', label:'人员管理', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>' });
      }
      items.push({ id:'pool', label:'资源总览', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' });
      if (isAdmin.value) items.push({ id:'users', label:'用户管理', icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>' });
      return items;
    });

    // 仪表盘展开详情（按设备名称分组，显示剩余/总数）
    const equipmentDetail = computed(() => {
      const groups = {};
      equipmentUnits.value.forEach(u => {
        const eq = equipmentList.value.find(e => e.id === u.equipment_id);
        const name = eq?.name || '未知';
        if (!groups[name]) groups[name] = { name, occupied: 0, total: 0 };
        groups[name].total++;
        if (u.status === 'occupied') groups[name].occupied++;
      });
      return Object.values(groups).map(g => ({ ...g, available: g.total - g.occupied }));
    });

    // 根据 equipment_id 查找设备名称
    function unitName(eqId) { const eq = equipmentList.value.find(e => e.id === eqId); return eq?.name || '未知'; }

    // ===== 工具函数 =====
    function showToast(msg, type='info') { if(toastTimer)clearTimeout(toastTimer); toast.value={show:true,message:msg,type}; toastTimer=setTimeout(()=>toast.value.show=false,3000); }
    function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value; }
    function toggleViewMode() { viewMode.value=viewMode.value==='desktop'?'mobile':'desktop'; showMobileNav.value=false; }
    function getUserEmail() { return toEmail(userProfile.value?.login_name); }
    function statusLabel(s) { const m={available:'可用',occupied:'占用中',active:'预约中',cancelled:'已取消'}; return m[s]||s||'未知'; }
    function roleLabelFor(r) { const m={user:'普通用户',admin:'管理员',super_admin:'超级管理员'}; return m[r]||'未知'; }

    function switchPage(p) {
      page.value = p;
      if (p === 'calendar') nextTick(() => initCalendar());
      else if (p === 'my-reservations') loadMyReservations();
    }

    // ===== 认证 =====
    async function doLogin() {
      if(!loginForm.value.login_name||!loginForm.value.password) { authError.value='请输入登录名和密码'; return; }
      if(!/^[a-zA-Z0-9._-]+$/.test(loginForm.value.login_name)){ authError.value='登录名只能使用英文、数字、下划线和连字符'; return; }
      authLoading.value=true; authError.value='';
      try {
        const {error}=await supabase.auth.signInWithPassword({email:toEmail(loginForm.value.login_name),password:loginForm.value.password});
        if(error) throw error;
        await loadSession();
      } catch(err) { authError.value=err.message||'登录失败'; }
      finally { authLoading.value=false; }
    }

    async function doRegister() {
      const f=regForm.value;
      if(!f.login_name||!f.password||!f.full_name||!f.employee_id||!f.department) { authError.value='请填写所有必填字段'; return; }
      if(f.password.length<6) { authError.value='密码至少6位'; return; }
      if(!/^[a-zA-Z0-9._-]+$/.test(f.login_name)){ authError.value='登录名只能使用英文、数字、下划线和连字符'; return; }
      authLoading.value=true; authError.value='';
      try {
        const {error}=await supabase.auth.signUp({email:toEmail(f.login_name),password:f.password,options:{data:{login_name:f.login_name,full_name:f.full_name,employee_id:f.employee_id,department:f.department,division:f.division||'',region:f.region||''}}});
        if(error) throw error;
        showToast('注册成功，请登录','success');
        page.value='login';
        loginForm.value.login_name=f.login_name;
      } catch(err) { authError.value=err.message||'注册失败'; }
      finally { authLoading.value=false; }
    }

    async function doLogout() {
      await supabase.auth.signOut();
      user.value=null; userProfile.value=null;
      page.value='login';
      if(calendarInstance){calendarInstance.destroy();calendarInstance=null;}
    }

    async function loadSession() {
      const {data:{session}}=await supabase.auth.getSession();
      if(session?.user) {
        user.value=session.user;
        await new Promise(r=>setTimeout(r,500));
        await loadProfile();
        await loadAllData();
        page.value='dashboard';
      }
    }

    async function loadProfile() {
      if(!user.value) return;
      const {data,error}=await supabase.rpc('get_my_profile');
      if(data) userProfile.value=data;
      else if(error) throw error;
    }

    async function loadAllData() {
      await Promise.all([loadEquipment(), loadEquipmentUnits(), loadPersonnel(), loadPersonnelAssignments(), loadUsers()]);
      loadMyReservations();
    }

    async function loadEquipment() { const {data}=await supabase.from('equipment').select('*').order('id'); if(data) equipmentList.value=data; }
    async function loadEquipmentUnits() { const {data}=await supabase.from('equipment_units').select('*').order('id'); if(data) equipmentUnits.value=data; }
    async function loadPersonnel() { const {data}=await supabase.from('personnel').select('*').order('id'); if(data) personnel.value=data; }
    async function loadPersonnelAssignments() { const {data}=await supabase.from('personnel_assignments').select('*,personnel!inner(name)').order('start_date'); if(data) personnelAssignments.value=data; }
    async function loadMyReservations() { if(!user.value)return; const {data}=await supabase.from('equipment_reservations').select('*').eq('user_id',user.value.id).order('created_at',{ascending:false}); if(data) myReservations.value=data; }
    async function loadUsers() { if(!isAdmin.value){ userList.value=[]; return; } const {data,error}=await supabase.rpc('list_all_profiles'); if(data) userList.value=data; }
    async function loadAllReservations() { const {data}=await supabase.from('equipment_reservations').select('*').eq('status','active'); return data||[]; }

    // ===== 资产CRUD（每行一个独立资产） =====
    function editUnit(unit) {
      editingEquipment.value = unit;
      const eq = equipmentList.value.find(e => e.id === unit.equipment_id);
      eqForm.value = { name: eq?.name || '', serial_no: unit.serial_no, params: unit.params || '', accessories: unit.accessories || '', custodian: unit.custodian || '', location: unit.current_location || '', notes: unit.notes || '' };
      showEquipmentForm.value = true;
    }

    async function saveEquipment() {
      const f = eqForm.value;
      if (!f.name || !f.serial_no) { showToast('请填写资产名称和编号', 'error'); return; }
      saving.value = true;
      try {
        // 查找或创建设备类型
        let eq = equipmentList.value.find(e => e.name === f.name);
        if (!eq) {
          const { data, error } = await supabase.from('equipment').insert({ name: f.name, code: 'EQ-' + Date.now() }).select();
          if (error) throw error;
          eq = data[0];
          await loadEquipment();
        }

        if (editingEquipment.value) {
          // 更新已有单元
          await supabase.from('equipment_units').update({
            equipment_id: eq.id, serial_no: f.serial_no, custodian: f.custodian,
            params: f.params, accessories: f.accessories,
            current_location: f.location, notes: f.notes
          }).eq('id', editingEquipment.value.id);
          showToast('资产已更新', 'success');
        } else {
          // 新增单元
          await supabase.from('equipment_units').insert({
            equipment_id: eq.id, serial_no: f.serial_no, custodian: f.custodian,
            params: f.params, accessories: f.accessories,
            current_location: f.location, notes: f.notes
          });
          showToast('资产已添加', 'success');
        }
        showEquipmentForm.value = false;
        editingEquipment.value = null;
        eqForm.value = { name: '', serial_no: '', params: '', accessories: '', custodian: '', location: '', notes: '' };
        await loadEquipmentUnits();
      } catch (err) { showToast(err.message || '操作失败', 'error'); }
      finally { saving.value = false; }
    }

    async function deleteUnit(id) {
      if (!confirm('确定删除该资产？')) return;
      try {
        await supabase.from('equipment_units').delete().eq('id', id);
        showToast('资产已删除', 'success');
        await loadEquipmentUnits();
      } catch (err) { showToast(err.message || '删除失败', 'error'); }
    }

    // ===== 人员管理 =====
    function openPersonnelForm(p) {
      editingPersonnelId.value=p?.id||null;
      personnelForm.value={name:p?.name||''};
      showPersonnelForm.value=true;
    }
    async function savePersonnel() {
      if(!personnelForm.value.name){showToast('请输入姓名','error');return;}
      saving.value=true;
      try {
        if(editingPersonnelId.value) { await supabase.from('personnel').update({name:personnelForm.value.name}).eq('id',editingPersonnelId.value); showToast('已更新','success'); }
        else { await supabase.from('personnel').insert({name:personnelForm.value.name}); showToast('已添加','success'); }
        showPersonnelForm.value=false; await loadPersonnel();
      } catch(err) { showToast(err.message||'操作失败','error'); }
      finally { saving.value=false; }
    }
    async function deletePersonnel(id) { if(!confirm('确定删除该人员？'))return; try{await supabase.from('personnel').delete().eq('id',id);showToast('已删除','success');await loadPersonnel();await loadPersonnelAssignments();}catch(err){showToast(err.message||'删除失败','error');} }

    // ===== 任务管理 =====
    function openTaskForm(person) {
      taskPersonId.value=person.id; taskPersonName.value=person.name;
      taskForm.value={start_date:'',end_date:'',task_description:''};
      showTaskForm.value=true;
    }
    function tasksForPerson(personId) { return personnelAssignments.value.filter(a=>a.person_id===personId); }
    async function saveTask() {
      if(!taskForm.value.start_date||!taskForm.value.end_date){showToast('请填写日期','error');return;}
      saving.value=true;
      try {
        await supabase.from('personnel_assignments').insert({person_id:taskPersonId.value,start_date:taskForm.value.start_date,end_date:taskForm.value.end_date,task_description:taskForm.value.task_description});
        showToast('任务已添加','success');
        showTaskForm.value=false; await loadPersonnelAssignments();
      } catch(err) { showToast(err.message||'操作失败','error'); }
      finally { saving.value=false; }
    }
    async function deleteTask(id) { if(!confirm('确定删除该任务？'))return; try{await supabase.from('personnel_assignments').delete().eq('id',id);showToast('已删除','success');await loadPersonnelAssignments();}catch(err){showToast(err.message||'删除失败','error');} }

    // ===== 预约 =====
    const allReservations = ref([]);

    async function openBookingModal(date) {
      bookingDate.value=date; bookingStart.value=date; bookingEnd.value=date;
      bookingCountry.value=''; bookingPurpose.value='';
      bookingEquipmentSel.value={}; bookingPersonnelSel.value=[];
      // 刷新预约数据，用于计算可用设备数
      allReservations.value = await loadAllReservations();
      showBookingModal.value=true;
    }

    // 计算指定设备的可用数量（考虑已选中日期范围）
    function getDateAvailable(eqId) {
      const s = bookingStart.value, e = bookingEnd.value;
      if (!s || !e) return 0;
      const units = equipmentUnits.value.filter(u => u.equipment_id === eqId && u.status === 'available');
      if (!units.length) return 0;
      const occupied = new Set();
      for (const r of allReservations.value) {
        if (r.status !== 'active') continue;
        if (s > r.end_date || e < r.start_date) continue;
        const sels = typeof r.equipment_selections === 'string' ? JSON.parse(r.equipment_selections) : (r.equipment_selections || []);
        for (const sel of sels) {
          if (sel.eq_id === eqId) (sel.unit_ids || []).forEach(uid => occupied.add(uid));
        }
      }
      return units.filter(u => !occupied.has(u.id)).length;
    }

    function toggleBookingEquipment(eqId) {
      if(bookingEquipmentSel.value[eqId]) { const{...rest}=bookingEquipmentSel.value; delete rest[eqId]; bookingEquipmentSel.value=rest; }
      else bookingEquipmentSel.value={...bookingEquipmentSel.value,[eqId]:1};
    }
    function setBookingEqQty(eqId,qty) {
      bookingEquipmentSel.value={...bookingEquipmentSel.value,[eqId]:Math.max(1,parseInt(qty)||1)};
    }
    function toggleBookingPerson(personId) {
      const idx=bookingPersonnelSel.value.indexOf(personId);
      if(idx>=0) bookingPersonnelSel.value.splice(idx,1);
      else bookingPersonnelSel.value.push(personId);
    }

    async function submitBooking() {
      const eqEntries=Object.entries(bookingEquipmentSel.value).filter(([_,q])=>q>0);
      if(!eqEntries.length){showToast('请选择设备','error');return;}
      if(!bookingStart.value||!bookingEnd.value){showToast('请选择日期','error');return;}
      if(!bookingCountry.value){showToast('请选择国家','error');return;}

      bookingLoading.value=true;
      try {
        // 遍历每一天检查设备和人员
        const start=new Date(bookingStart.value);
        const end=new Date(bookingEnd.value);
        const existingReservations = await loadAllReservations();

        for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)) {
          const dateStr=d.toISOString().slice(0,10);

          // 设备检查
          for(const [eqIdStr,qty] of eqEntries) {
            const eqId=parseInt(eqIdStr);
            const totalUnits=equipmentUnits.value.filter(u=>u.equipment_id===eqId);
            const occupiedIds=new Set();
            for(const r of existingReservations) {
              if(r.status!=='active') continue;
              if(dateStr<r.start_date||dateStr>r.end_date) continue;
              const selections=typeof r.equipment_selections==='string'?JSON.parse(r.equipment_selections):r.equipment_selections||[];
              for(const sel of selections) {
                if(sel.eq_id===eqId) (sel.unit_ids||[]).forEach(uid=>occupiedIds.add(uid));
              }
            }
            const available=totalUnits.filter(u=>!occupiedIds.has(u.id)&&u.status==='available').length;
            if(available<qty) {
              const eqName=equipmentList.value.find(e=>e.id===eqId)?.name||eqId;
              showToast(`${dateStr} ${eqName}不足（仅剩${available}台），请调整`,'error');
              bookingLoading.value=false; return;
            }
          }

          // 人员检查
          if(bookingPersonnelSel.value.length>0) {
            const busyIds=new Set();
            for(const a of personnelAssignments.value) {
              if(dateStr>=a.start_date&&dateStr<=a.end_date) busyIds.add(a.person_id);
            }
            const free=personnel.value.filter(p=>!busyIds.has(p.id)).length;
            if(free<bookingPersonnelSel.value.length) {
              showToast(`${dateStr} 人员不足（仅${free}人空闲），请调整`,'error');
              bookingLoading.value=false; return;
            }
          }
        }

        // 通过验证，分配单元并提交
        const selections=[];
        for(const [eqIdStr,qty] of eqEntries) {
          const eqId=parseInt(eqIdStr);
          const allUnits=equipmentUnits.value.filter(u=>u.equipment_id===eqId);
          const startD=new Date(start);
          const endD=new Date(end);
          const occupiedIds=new Set();

          for(const r of existingReservations) {
            if(r.status!=='active') continue;
            for(let d2=new Date(startD);d2<=endD;d2.setDate(d2.getDate()+1)) {
              const ds=d2.toISOString().slice(0,10);
              if(ds<r.start_date||ds>r.end_date) continue;
              const sels=typeof r.equipment_selections==='string'?JSON.parse(r.equipment_selections):r.equipment_selections||[];
              for(const sel of sels) { if(sel.eq_id===eqId) (sel.unit_ids||[]).forEach(uid=>occupiedIds.add(uid)); }
            }
          }

          const available=allUnits.filter(u=>u.status==='available'&&!occupiedIds.has(u.id));
          const assign=available.slice(0,qty);
          selections.push({eq_id:eqId,qty,unit_ids:assign.map(u=>u.id)});

          // 更新单元状态
          if(assign.length) await supabase.rpc('update_equipment_units_status',{p_unit_ids:assign.map(u=>u.id),p_new_status:'occupied',p_location:bookingCountry.value});
        }

        await supabase.from('equipment_reservations').insert({
          user_id:user.value.id,
          equipment_selections:selections,
          start_date:bookingStart.value,
          end_date:bookingEnd.value,
          country:bookingCountry.value,
          purpose:bookingPurpose.value,
          selected_personnel_ids:bookingPersonnelSel.value
        });

        showToast('预约成功！','success');
        showBookingModal.value=false;
        await loadMyReservations(); await loadEquipmentUnits();
        if(calendarInstance) setTimeout(() => refreshCalendar(), 500);
      } catch(err) { showToast(err.message||'预约失败','error'); }
      finally { bookingLoading.value=false; }
    }

    async function cancelReservation(id) {
      if(!confirm('确定取消该预约？'))return;
      try {
        const {data:[r]}=await supabase.from('equipment_reservations').select('equipment_selections').eq('id',id);
        await supabase.from('equipment_reservations').update({status:'cancelled'}).eq('id',id);
        if(r?.equipment_selections) {
          const sels=typeof r.equipment_selections==='string'?JSON.parse(r.equipment_selections):r.equipment_selections;
          for(const sel of sels) {
            if(sel.unit_ids?.length) await supabase.rpc('update_equipment_units_status',{p_unit_ids:sel.unit_ids,p_new_status:'available',p_location:''});
          }
        }
        showToast('预约已取消','success');
        await loadMyReservations(); await loadEquipmentUnits();
        if(calendarInstance) setTimeout(() => refreshCalendar(), 500);
      } catch(err) { showToast(err.message||'取消失败','error'); }
    }

    // ===== 预约详情（格式化）=====
    function reservationDescription(r) {
      if(!r.equipment_selections) return '';
      const sels=typeof r.equipment_selections==='string'?JSON.parse(r.equipment_selections):r.equipment_selections;
      return sels.map(s=>{
        const eq=equipmentList.value.find(e=>e.id===s.eq_id);
        return `${eq?.name||'设备'} x${s.qty}`;
      }).join(', ');
    }

    // ===== FullCalendar =====
    async function initCalendar() {
      const el=document.getElementById('booking-calendar');
      if(!el) return;
      if(calendarInstance) calendarInstance.destroy();

      // 先加载预约数据到缓存，避免每个日期格重复请求
      allReservations.value = await loadAllReservations();

      calendarInstance=new FullCalendar.Calendar(el,{
        initialView:'dayGridMonth', locale:'zh-cn',
        headerToolbar:{left:'prev,next today',center:'title'},
        buttonText:{today:'今天'},
        height:'auto',
        dateClick:(info)=>openBookingModal(info.dateStr),
        dayCellDidMount:(info)=>{renderDayContent(info); bindDayEvents(info);},
        events:[]
      });
      calendarInstance.render();
      await renderCalendarEvents();
    }

    async function renderCalendarEvents() {
      if(!calendarInstance) return;
      const allRes=allReservations.value;
      const events=[];
      for(const r of allRes) {
        const sels=typeof r.equipment_selections==='string'?JSON.parse(r.equipment_selections):r.equipment_selections||[];
        if(sels.length){
          events.push({title:`${sels.length}种设备`,start:r.start_date,end:r.end_date,allDay:true,backgroundColor:'rgba(168,85,247,0.4)',borderColor:'#a855f7',textColor:'#fff'});
        }
      }
      calendarInstance.removeAllEvents();
      events.forEach(e=>calendarInstance.addEvent(e));
      markDaysWithReservations();
    }

    // 重建日历（预约/取消后刷新显示）
    async function refreshCalendar() {
      if (calendarInstance) { calendarInstance.destroy(); calendarInstance = null; }
      await initCalendar();
    }

    function markDaysWithReservations() {
      const allRes=allReservations.value;
      const dates=new Set();
      for(const r of allRes) {
        const s=new Date(r.start_date),e=new Date(r.end_date);
        for(let d=new Date(s);d<=e;d.setDate(d.getDate()+1)) dates.add(d.toISOString().slice(0,10));
      }
      document.querySelectorAll('.fc-daygrid-day').forEach(el=>{
        const dateStr=el.getAttribute('data-date');
        if(dateStr&&dates.has(dateStr)) el.classList.add('fc-day-has-reservation');
      });
    }

    function renderDayContent(info) {
      const dateStr=info.date.getFullYear()+'-'+String(info.date.getMonth()+1).padStart(2,'0')+'-'+String(info.date.getDate()).padStart(2,'0');
      const allRes=allReservations.value;
      const dayRes=allRes.filter(r=>r.status==='active'&&dateStr>=r.start_date&&dateStr<=r.end_date);

      if(!dayRes.length) return;

      // 设备占用统计
      const eqOcc={};
      for(const r of dayRes) {
        const sels=typeof r.equipment_selections==='string'?JSON.parse(r.equipment_selections):r.equipment_selections||[];
        for(const sel of sels) {
          eqOcc[sel.eq_id]=(eqOcc[sel.eq_id]||0)+sel.qty;
        }
      }

      // 人员占用统计
      let busyPersonCount=0;
      for(const a of personnelAssignments.value) {
        if(dateStr>=a.start_date&&dateStr<=a.end_date) busyPersonCount++;
      }

      let html='<div class="fc-day-avail">';
      for(const [eqIdStr,occupied] of Object.entries(eqOcc)) {
        const eqId=parseInt(eqIdStr);
        const eq=equipmentList.value.find(e=>e.id===eqId);
        const total = equipmentUnits.value.filter(u => u.equipment_id === eqId).length;
        const available = total - occupied;
        if(eq) html+=`<div class="eq-occ">${eq.name} ${available}/${total}</div>`;
      }
      if(personnel.value.length>0) {
        html+=`<div class="ppl-occ">无线小队 ${busyPersonCount}/${personnel.value.length}</div>`;
      }
      html+='</div>';
      const el=info.el.querySelector('.fc-daygrid-day-events')||info.el;
      const existing=el.querySelector('.fc-day-avail');
      if(!existing) el.insertAdjacentHTML('beforeend',html);
    }

    async function bindDayEvents(info) {
      const dateStr=info.date.getFullYear()+'-'+String(info.date.getMonth()+1).padStart(2,'0')+'-'+String(info.date.getDate()).padStart(2,'0');
      const el=info.el;
      el.addEventListener('mouseenter',async (e)=>{await showDayTooltip(e,dateStr);});
      el.addEventListener('mouseleave',()=>{tooltipData.value.show=false;});
      el.addEventListener('mousemove',(e)=>{if(tooltipData.value.show){tooltipData.value.x=e.clientX+10;tooltipData.value.y=e.clientY+10;}});
    }

    async function showDayTooltip(e,dateStr) {
      const allRes=allReservations.value;
      const dayRes=allRes.filter(r=>r.status==='active'&&dateStr>=r.start_date&&dateStr<=r.end_date);
      const dayAssign=personnelAssignments.value.filter(a=>dateStr>=a.start_date&&dateStr<=a.end_date);

      if(!dayRes.length&&!dayAssign.length){tooltipData.value.show=false;return;}

      let html=`<div class="tooltip-title">${dateStr} 预约详情</div>`;

      // 设备预约
      for(const r of dayRes) {
        const sels=typeof r.equipment_selections==='string'?JSON.parse(r.equipment_selections):r.equipment_selections||[];
        for(const sel of sels) {
          const eq=equipmentList.value.find(e=>e.id===sel.eq_id);
          html+=`<div class="tooltip-item">📋 ${eq?.name||'设备'} x${sel.qty}<br/><span class="tooltip-more">预约人: ${(userList.value.find(u=>u.id===r.user_id)?.full_name)||'未知'} | 国家: ${r.country||'-'} | 用途: ${r.purpose||'-'}</span></div>`;
        }
      }

      // 人员占用
      if(dayAssign.length) {
        html+=`<div class="tooltip-section-title">👤 人员占用</div>`;
        for(const a of dayAssign) {
          html+=`<div class="tooltip-item">${a.personnel?.name||'未知'} - ${a.task_description||'任务'} (${a.start_date}~${a.end_date})</div>`;
        }
      }

      tooltipData.value={show:true,x:e.clientX+10,y:e.clientY+10,content:html};
    }

    // ===== 初始化 =====
    onMounted(async () => {
      try {
        const {data:{session}}=await supabase?.auth?.getSession();
        if(session?.user) {
          user.value=session.user;
          await new Promise(r=>setTimeout(r,500));
          await loadProfile();
          await loadAllData();
          page.value='dashboard';
          return;
        }
      } catch(e){console.warn(e);}
      page.value='login';
    });

    supabase?.auth?.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_IN'&&session?.user&&!user.value){user.value=session.user;setTimeout(async()=>{await loadProfile();await loadAllData();page.value='dashboard';},500);}
      if(event==='SIGNED_OUT'){user.value=null;userProfile.value=null;page.value='login';}
    });

    return {
      page, loading, saving, authLoading, authError, sidebarCollapsed, viewMode, showMobileNav,
      user, userProfile, userList, toast, tooltipData,
      loginForm, regForm,
      equipmentList, equipmentUnits, personnel, personnelAssignments, myReservations, allReservations,
      equipmentDetail, expandedEquipmentId,
      showEquipmentForm, editingEquipment, eqForm,
      showPersonnelForm, personnelForm, editingPersonnelId,
      showTaskForm, taskPersonId, taskPersonName, taskForm,
      showBookingModal, bookingDate, bookingStart, bookingEnd,
      bookingCountry, bookingPurpose, bookingLoading,
      bookingEquipmentSel, bookingPersonnelSel,
      isLoggedIn, isAdmin, roleLabel, menuItems, dashboardStats, countryList,
      doLogin, doRegister, doLogout, switchPage, toggleSidebar, toggleViewMode,
      statusLabel, roleLabelFor,
      unitName, reservationDescription,
      editUnit, saveEquipment, deleteUnit,
      openPersonnelForm, savePersonnel, deletePersonnel,
      openTaskForm, tasksForPerson, saveTask, deleteTask,
      openBookingModal, getDateAvailable, toggleBookingEquipment, setBookingEqQty, toggleBookingPerson, submitBooking,
      cancelReservation
    };
  }
});
app.mount('#app');
