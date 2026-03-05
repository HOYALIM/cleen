(() => {
  const worldLogo = document.getElementById("worldLogo");
  if (!worldLogo) {
    return;
  }

  let rafId = 0;

  const setWorldLogoTransform = () => {
    rafId = 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const driftY = scrollY * 0.12;
    const rotate = scrollY * 0.01;
    worldLogo.style.transform = `translate3d(-50%, calc(-50% + ${driftY.toFixed(2)}px), 0) rotate(${rotate.toFixed(2)}deg)`;
  };

  const onScroll = () => {
    if (rafId) {
      return;
    }
    rafId = window.requestAnimationFrame(setWorldLogoTransform);
  };

  setWorldLogoTransform();
  window.addEventListener("scroll", onScroll, { passive: true });
})();