export function glassSpecular(node) {
  const move = (x, y) => {
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--spec-x', `${x - rect.left}px`);
    node.style.setProperty('--spec-y', `${y - rect.top}px`);
    node.style.setProperty('--spec-o', '1');
  };

  const clear = () => {
    node.style.setProperty('--spec-o', '0');
  };

  const onPointerMove = (e) => move(e.clientX, e.clientY);
  const onPointerLeave = () => clear();
  const onTouchMove = (e) => {
    const t = e.touches[0];
    if (t) move(t.clientX, t.clientY);
  };
  const onTouchEnd = () => clear();

  node.addEventListener('pointermove', onPointerMove, { passive: true });
  node.addEventListener('pointerleave', onPointerLeave);
  node.addEventListener('touchmove', onTouchMove, { passive: true });
  node.addEventListener('touchend', onTouchEnd);

  return {
    destroy() {
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerleave', onPointerLeave);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
    }
  };
}
