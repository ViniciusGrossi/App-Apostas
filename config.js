// Configuração do Supabase
const SUPABASE_CONFIG = {
    url: 'https://cjlvcjfuntfbdrrkigwh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbHZjamZ1bnRmYmRycmtpZ3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMzYyMDIsImV4cCI6MjA1NTgxMjIwMn0.FBSsXa2vVmrv78_XeLWZcpMKMUIeRe0mS9hBO7Cn45Y'
};

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
