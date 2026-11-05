async function carregarComponente(id, arquivo) {
  const elemento = document.getElementById(id);
  if (!elemento) return;
  try {
    const resposta = await fetch(arquivo);
    if (!resposta.ok) throw new Error(`Falha ao carregar ${arquivo}`);
    elemento.innerHTML = await resposta.text();
    document.dispatchEvent(new CustomEvent("technova:component-loaded", { detail: { id } }));
  } catch (erro) {
    console.error(erro);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  carregarComponente("header", "/Components/header.html");
  carregarComponente("footer", "/Components/footer.html");
});
