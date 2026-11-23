const API = "https://thoealocmdcimugptxcm.supabase.co/functions/v1/api";
const DEVICE = "horta-01";
const METRIC = "soil_moisture";
const INTERVALO_COLETA_S = 10;
const LIMITE_DESATUALIZADO_S = INTERVALO_COLETA_S * 3;
const ATUALIZA_PAINEL_MS = 5000;

const el = (id) => document.getElementById(id);
let grafico = null;

function formataHora(iso) {
  return new Date(iso).toLocaleTimeString("pt-BR");
}

async function consulta(caminho) {
  const r = await fetch(`${API}/${caminho}`);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

function atualizaCartao(leitura) {
  const card = el("card");
  if (!leitura) {
    card.className = "card sem-dados";
    el("status").textContent = "Nenhuma leitura recebida ainda";
    return;
  }
  const idade = (Date.now() - new Date(leitura.created_at).getTime()) / 1000;
  const desatualizado = idade > LIMITE_DESATUALIZADO_S;

  el("valor").textContent = Number(leitura.value).toFixed(1);
  el("unidade").textContent = leitura.unit;
  el("atualizacao").textContent = new Date(leitura.created_at).toLocaleString("pt-BR");
  el("aviso-desatualizado").hidden = !desatualizado;

  if (desatualizado) {
    card.className = "card desatualizado";
    el("status").textContent = "Dados desatualizados";
  } else if (leitura.alert) {
    card.className = "card alerta";
    el("status").textContent = "Solo seco, irrigar!";
  } else {
    card.className = "card ok";
    el("status").textContent = "Solo com umidade adequada";
  }
}

async function atualiza() {
  try {
    const q = `device_id=${DEVICE}&metric=${METRIC}`;
    const [ultima, historico] = await Promise.all([
      consulta(`latest?${q}`),
      consulta(`history?${q}&limit=50`),
    ]);
    atualizaCartao(ultima);
  } catch (e) {
    el("status").textContent = "Erro ao consultar a API";
    console.error(e);
  }
}

atualiza();
setInterval(atualiza, ATUALIZA_PAINEL_MS);