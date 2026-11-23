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

function atualizaGrafico(historico) {
  const dados = [...historico].reverse(); // do mais antigo para o mais novo
  const labels = dados.map((d) => formataHora(d.created_at));
  const valores = dados.map((d) => Number(d.value));

  if (!grafico) {
    grafico = new Chart(el("grafico"), {
      type: "line",
      data: { labels, datasets: [{ label: "Umidade (%)", data: valores, borderColor: "#2e9e4f", tension: 0.2 }] },
      options: { animation: false, scales: { y: { min: 0, max: 100 } } },
    });
  } else {
    grafico.data.labels = labels;
    grafico.data.datasets[0].data = valores;
    grafico.update();
  }
}

function atualizaTabela(historico) {
  el("tabela").innerHTML = historico.slice(0, 20).map((d) => `
    <tr>
      <td>${new Date(d.created_at).toLocaleString("pt-BR")}</td>
      <td>${Number(d.value).toFixed(1)} ${d.unit}</td>
      <td class="${d.alert ? "tag-alerta" : "tag-ok"}">${d.alert ? "Solo seco" : "Ok"}</td>
    </tr>`).join("");
}

async function atualiza() {
  try {
    const q = `device_id=${DEVICE}&metric=${METRIC}`;
    const [ultima, historico] = await Promise.all([
      consulta(`latest?${q}`),
      consulta(`history?${q}&limit=50`),
    ]);
    atualizaCartao(ultima);
    atualizaGrafico(historico);
    atualizaTabela(historico);
  } catch (e) {
    el("status").textContent = "Erro ao consultar a API";
    console.error(e);
  }
}

atualiza();
setInterval(atualiza, ATUALIZA_PAINEL_MS);