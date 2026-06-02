import { useEffect, useRef } from 'react';

/**
 * Drag-and-drop + tap-to-place behavior for a set of draggable items and drop zones.
 * Works on desktop (drag) and touch screens / trackpads (tap item, tap zone).
 *
 * Options:
 *   itemSelector   CSS selector for draggable items (must carry data-item="<id>")
 *   zoneSelector   CSS selector for drop zones (must carry data-zone="<id>")
 *   ignoreSelector CSS selector for clicks that must NOT trigger pick-up (checkboxes, dropdowns…)
 *   onMove(itemId, zoneId)  called on a successful drag-drop or tap-place
 *   hintText(itemId) -> string  optional floating-hint text while an item is "picked up"
 */
export function usePlaceable({ itemSelector, zoneSelector, ignoreSelector, onMove, hintText }) {
  const cb = useRef({ onMove, hintText });
  cb.current = { onMove, hintText };

  useEffect(() => {
    let draggingId = null;
    let selectedId = null;
    let suppressClick = false;

    const allZones = () => Array.from(document.querySelectorAll(zoneSelector));

    function clearSelection() {
      selectedId = null;
      document.querySelectorAll('.placeable-selected').forEach((el) => el.classList.remove('placeable-selected'));
      allZones().forEach((z) => z.classList.remove('place-target'));
      const h = document.getElementById('place-hint');
      if (h) h.style.display = 'none';
    }

    function showHint(id, el) {
      if (el) el.classList.add('placeable-selected');
      allZones().forEach((z) => z.classList.add('place-target'));
      const text = cb.current.hintText ? cb.current.hintText(id) : null;
      if (!text) return;
      let h = document.getElementById('place-hint');
      if (!h) { h = document.createElement('div'); h.id = 'place-hint'; document.body.appendChild(h); }
      h.innerHTML = text;
      h.style.display = 'block';
    }

    const onDragStart = (e) => {
      const item = e.target.closest(itemSelector);
      if (!item) return;
      draggingId = item.dataset.item;
      suppressClick = true;
      clearSelection();
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggingId);
    };
    const onDragEnd = () => {
      document.querySelectorAll(`${itemSelector}.dragging`).forEach((p) => p.classList.remove('dragging'));
      document.querySelectorAll('.drag-over').forEach((z) => z.classList.remove('drag-over'));
      draggingId = null;
      setTimeout(() => { suppressClick = false; }, 60);
    };
    const onDragOver = (e) => {
      const zone = e.target.closest(zoneSelector);
      if (!zone) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.drag-over').forEach((z) => z.classList.remove('drag-over'));
      zone.classList.add('drag-over');
    };
    const onDrop = (e) => {
      const zone = e.target.closest(zoneSelector);
      if (!zone || !draggingId) return;
      e.preventDefault();
      zone.classList.remove('drag-over');
      const id = draggingId;
      const zoneId = zone.dataset.zone;
      cb.current.onMove(id, zoneId);
    };
    const onClick = (e) => {
      if (suppressClick) return;
      if (ignoreSelector && e.target.closest(ignoreSelector)) return;
      const item = e.target.closest(itemSelector);
      const zone = e.target.closest(zoneSelector);
      if (selectedId) {
        if (item && item.dataset.item === selectedId) { clearSelection(); return; }
        if (zone) { const id = selectedId; clearSelection(); cb.current.onMove(id, zone.dataset.zone); return; }
        clearSelection();
        return;
      }
      if (item) { selectedId = item.dataset.item; showHint(selectedId, item); }
    };

    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('dragend', onDragEnd);
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    document.addEventListener('click', onClick);
    return () => {
      clearSelection();
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('dragend', onDragEnd);
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
      document.removeEventListener('click', onClick);
    };
  }, [itemSelector, zoneSelector, ignoreSelector]);
}
