let indiceSlide = 0;

function mostrarSlide(indice) {
  const slides = document.querySelectorAll(".banner .slide");
  if (!slides.length) return;
  indiceSlide = (indice + slides.length) % slides.length;
  slides.forEach((slide, index) => slide.classList.toggle("active", index === indiceSlide));
}

function mudarSlide(direcao) {
  mostrarSlide(indiceSlide + direcao);
}

document.addEventListener("DOMContentLoaded", () => {
  mostrarSlide(indiceSlide);
  if (document.querySelectorAll(".banner .slide").length > 1) {
    window.setInterval(() => mudarSlide(1), 6000);
  }
});
