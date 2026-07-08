// ============================================================
// TRADUCTOR MINIMO DE MARKDOWN -> HTML
// Cubre lo que usan los documentos legales de la tienda: titulos
// (#, ##, ###), listas (- ) y negrilla (**texto**). Si algun dia
// se necesita Markdown completo (tablas, links...), cambiar por la
// libreria "marked".
//
// SEGURIDAD: primero se escapan los caracteres especiales de HTML,
// asi nada del texto original puede convertirse en una etiqueta.
// Ademas Angular sanitiza el HTML al inyectarlo con [innerHTML].
// ============================================================

// **texto** -> <strong>texto</strong>
function negrilla(texto: string): string {
  return texto.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function markdownAHtml(md: string): string {
  const escapado = (md ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const salida: string[] = [];
  let enLista = false;

  for (const cruda of escapado.split('\n')) {
    const linea = cruda.trim();

    // Al salir de un bloque de lista se cierra el <ul>
    if (enLista && !linea.startsWith('- ')) {
      salida.push('</ul>');
      enLista = false;
    }

    if (!linea) continue;                       // linea vacia = separacion

    if (linea.startsWith('### ')) {
      salida.push(`<h3>${negrilla(linea.slice(4))}</h3>`);
    } else if (linea.startsWith('## ')) {
      salida.push(`<h2>${negrilla(linea.slice(3))}</h2>`);
    } else if (linea.startsWith('# ')) {
      salida.push(`<h1>${negrilla(linea.slice(2))}</h1>`);
    } else if (linea.startsWith('- ')) {
      if (!enLista) { salida.push('<ul>'); enLista = true; }
      salida.push(`<li>${negrilla(linea.slice(2))}</li>`);
    } else {
      salida.push(`<p>${negrilla(linea)}</p>`);
    }
  }
  if (enLista) salida.push('</ul>');
  return salida.join('\n');
}
