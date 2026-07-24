// ... resto do código

// No login, gerar EVOSESSIONID e INSTANCE para o usuário
const handleLogin = async (loginValue: string, password: string) => {
  sessionStorage.setItem('temp_password', password);
  
  // Gera EVOSESSIONID e INSTANCE únicos para este usuário
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  const evosessionid = `tztnmffxax4bftiot${timestamp}${random}`;
  const instance = `3wsaab-${evosessionid.substring(0, 20)}-PorROULigh000001`;
  
  localStorage.setItem('evo_evosessionid', evosessionid);
  localStorage.setItem('evo_instance', instance);
  localStorage.setItem('evo_client_version', "6.20260529.83717.62338-307701dd59-r2");
  
  console.log('🔑 EVOSESSIONID gerado:', evosessionid);
  console.log('🔧 INSTANCE gerado:', instance);
  
  return await login(loginValue, password);
};
