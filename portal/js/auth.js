// ============================================================
// 共享认证模块 - Portal + Booking 通用
// ============================================================
const supabaseUrl = window.SUPABASE_CONFIG?.supabaseUrl || '';
const supabaseAnonKey = window.SUPABASE_CONFIG?.supabaseAnonKey || '';
const internalDomain = window.SUPABASE_CONFIG?.internalDomain || '@booking.tea-pulse.cn';

const supabase = window.supabase?.createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: true, persistSession: true }
});

function toInternalEmail(name) {
  return name.toLowerCase().trim() + internalDomain;
}

function roleLabel(role) {
  const labels = { user: '普通用户', admin: '管理员', super_admin: '超级管理员' };
  return labels[role] || '未知';
}

function statusLabel(status) {
  const labels = { available: '可用', occupied: '占用中', active: '预约中', cancelled: '已取消', maintenance: '维修中', retired: '停用' };
  return labels[status] || status || '未知';
}

// ============================================================
// 认证 API
// ============================================================
async function authLogin(loginName, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email: toInternalEmail(loginName),
    password: password
  });
  if (error) throw error;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('登录失败');
  return session;
}

async function authRegister(form) {
  const { error } = await supabase.auth.signUp({
    email: toInternalEmail(form.login_name),
    password: form.password,
    options: {
      data: {
        login_name: form.login_name,
        full_name: form.full_name,
        employee_id: form.employee_id,
        department: form.department,
        division: form.division || '',
        region: form.region || ''
      }
    }
  });
  if (error) throw error;
}

async function authLogout() {
  await supabase.auth.signOut();
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function loadProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

// ============================================================
// 数据加载
// ============================================================
async function loadEquipment() {
  const { data } = await supabase.from('equipment').select('*').order('id');
  return data || [];
}

async function loadEquipmentUnits() {
  const { data } = await supabase.from('equipment_units').select('*').order('id');
  return data || [];
}

async function loadPersonnel() {
  const { data } = await supabase.from('personnel').select('*').order('id');
  return data || [];
}

async function loadPersonnelAssignments() {
  const { data } = await supabase.from('personnel_assignments').select('*, personnel!inner(name)').order('start_date');
  return data || [];
}

async function loadMyReservations(userId) {
  const { data } = await supabase.from('equipment_reservations').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return data || [];
}

async function loadAllReservations() {
  const { data } = await supabase.from('equipment_reservations').select('*').eq('status', 'active').order('created_at', { ascending: false });
  return data || [];
}

async function loadUsers() {
  const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  return data || [];
}
