// -- constantes y estado global --

// la memoria total del sistema es de 16 mib (2^24 bytes).
const MEMORIA_TOTAL = 16 * 1024 * 1024; 

// escala para la visualización. cada pixel en la barra representará esta cantidad de bytes.
// esto es para que la barra de memoria no sea gigantesca.
const ESCALA_GRAFICA = 64 * 1024; 

// 'memoria' es nuestro array principal. cada objeto en el array es un bloque o partición de memoria.
let memoria = [];

// un contador para asegurarnos de que cada proceso que cargamos tenga un id único (ej: notepad-1, notepad-2).
let contador_pid = 1;

// una lista de programas predefinidos con su nombre y tamaño en bytes.
const programas = {
  so:      { nombre: "Sistema Operativo", tamano: 2 * 1024 * 1024 },
  notepad: { nombre: "NotePad",           tamano: 1 * 1024 * 1024 },
  word:    { nombre: "Word",              tamano: 4 * 1024 * 1024 },
  excel:   { nombre: "Excel",             tamano: 3 * 1024 * 1024 },
  vscode:  { nombre: "VSCode",            tamano: 5 * 1024 * 1024 },
  paint:   { nombre: "Paint",             tamano: 512 * 1024 }
};

// -- inicialización --

// este evento se dispara cuando todo el html ha sido cargado por el navegador.
// es el punto de partida de nuestro script.
document.addEventListener("DOMContentLoaded", () => {
  // llenamos el menú desplegable con los programas que definimos arriba.
  const selector = document.getElementById("programaSelect");
  selector.innerHTML = ""; // limpiamos por si acaso.
  
  Object.keys(programas).forEach(clave => {
    const opcion = document.createElement("option");
    opcion.value = clave; // el valor interno será la clave (ej: 'notepad')
    const programa = programas[clave];
    // el texto visible será el nombre y su tamaño formateado.
    opcion.textContent = `${programa.nombre} (${formatear_tamano(programa.tamano)})`;
    selector.appendChild(opcion);
  });

  // agregamos un listener a los botones de radio. si el usuario cambia de método,
  // la memoria se reiniciará automáticamente.
  document.querySelectorAll("input[name='metodo']").forEach(radio => {
    radio.addEventListener("change", reiniciar_memoria);
  });

  // al cargar la página por primera vez, inicializamos la memoria.
  reiniciar_memoria();
});


// -- funciones de utilidad (helpers) --

/**
 * convierte un tamaño en bytes a un formato más legible (mib o kib).
 * @param {number} tamano_en_bytes - el tamaño en bytes a formatear.
 * @returns {string} el tamaño formateado como texto.
 */
function formatear_tamano(tamano_en_bytes) {
  if (tamano_en_bytes >= 1024 * 1024) {
    return (tamano_en_bytes / (1024 * 1024)).toFixed(2) + " MiB";
  }
  return (tamano_en_bytes / 1024).toFixed(0) + " KiB";
}

/**
 * convierte un número a su representación hexadecimal, rellenando con ceros a la izquierda.
 * @param {number} numero - el número decimal.
 * @returns {string} la cadena en formato hexadecimal (ej: "0x00A5F0").
 */
function a_hex(numero) {
    return `0x${numero.toString(16).toUpperCase().padStart(6, '0')}`;
}


// -- funciones de renderizado (dibujar en pantalla) --

/**
 * dibuja la barra de estado de la memoria y actualiza la tabla de particiones.
 * esta es la función principal para actualizar la interfaz de usuario.
 */
function actualizar_ui() {
  dibujar_barra_memoria();
  dibujar_tabla_particiones();
}

/**
 * actualiza la representación visual de la memoria.
 * recorre el array 'memoria' y crea un div para cada bloque.
 */
function dibujar_barra_memoria() {
  const contenedor = document.getElementById("memoria");
  contenedor.innerHTML = ""; // limpiamos la barra antes de volver a dibujarla.

  memoria.forEach(bloque => {
    const div_bloque = document.createElement("div");
    
    // calculamos qué tan "ancho" debe ser el bloque en la barra visual.
    // usamos flex-grow para que los tamaños sean proporcionales.
    const flexibilidad = Math.max(bloque.tamano / ESCALA_GRAFICA, 0.2);
    div_bloque.style.flex = flexibilidad;

    // el color del bloque depende de si está libre u ocupado.
    div_bloque.className = bloque.libre ? "bg-green-500" : "bg-red-500";
    
    // agregamos bordes para diferenciar los bloques y tooltips con información.
    div_bloque.className += " border-r-2 border-gray-800 text-white text-xs text-center overflow-hidden p-1 flex items-center justify-center";
    div_bloque.title = `Base: ${a_hex(bloque.inicio)}\nTamaño: ${formatear_tamano(bloque.tamano)}`;
    
    // escribimos dentro del bloque si está libre o qué proceso lo ocupa.
    // usamos white-space: pre-line para que los saltos de línea (\n) funcionen.
    div_bloque.style.whiteSpace = "pre-line";
    if (bloque.libre) {
        div_bloque.innerText = `Libre\n${formatear_tamano(bloque.tamano)}`;
    } else {
        // si está ocupado, mostramos el pid del proceso y la fragmentación interna.
        const frag_interna = bloque.tamano - bloque.tamano_proceso;
        div_bloque.innerText = `${bloque.pid}\n(${formatear_tamano(bloque.tamano_proceso)})`;
        div_bloque.title += `\nProceso: ${bloque.pid}\nTamaño Real: ${formatear_tamano(bloque.tamano_proceso)}\nFrag. Interna: ${formatear_tamano(frag_interna)}`;
    }
    
    contenedor.appendChild(div_bloque);
  });
}

/**
 * dibuja la tabla que detalla el estado de cada partición.
 */
function dibujar_tabla_particiones() {
  const cuerpo_tabla = document.querySelector("#tabla_particiones tbody");
  cuerpo_tabla.innerHTML = ""; // limpiamos la tabla.

  memoria.forEach((bloque, indice) => {
    const fila = document.createElement("tr");
    
    const frag_interna = (!bloque.libre && bloque.tamano > bloque.tamano_proceso) 
        ? formatear_tamano(bloque.tamano - bloque.tamano_proceso) 
        : "N/A";

    fila.innerHTML = `
      <td class="border px-4 py-2">${indice + 1}</td>
      <td class="border px-4 py-2">${bloque.libre ? "---" : bloque.pid}</td>
      <td class="border px-4 py-2">${bloque.libre ? "0 (Libre)" : "1 (Ocupado)"}</td>
      <td class="border px-4 py-2">${bloque.inicio}</td>
      <td class="border px-4 py-2">${a_hex(bloque.inicio)}</td>
      <td class="border px-4 py-2">${formatear_tamano(bloque.tamano)}</td>
      <td class="border px-4 py-2">${frag_interna}</td>
    `;
    cuerpo_tabla.appendChild(fila);
  });
}


// -- lógica principal de gestión de memoria --

/**
 * reinicia la simulación al estado inicial según el método seleccionado.
 */
function reiniciar_memoria() {
  contador_pid = 1; // reseteamos el contador de procesos.
  const metodo = document.querySelector("input[name='metodo']:checked").value;

  if (metodo === "fijo") {
    // para particiones fijas, dividimos la memoria en bloques iguales.
    // ejemplo: 8 particiones de 2 mib cada una (8 * 2 = 16 mib).
    memoria = [];
    let tamano_particion = 2 * 1024 * 1024;
    const numero_particiones = Math.floor(MEMORIA_TOTAL / tamano_particion);

    for (let i = 0; i < numero_particiones; i++) {
      memoria.push({
        inicio: i * tamano_particion,
        tamano: tamano_particion,
        libre: true,
        pid: null,
        tamano_proceso: 0 // para calcular fragmentación interna
      });
    }
  } else {
    // aquí irá la lógica para los otros métodos en el futuro.
    // por ahora, lo dejamos como un gran bloque libre.
    memoria = [{ inicio: 0, tamano: MEMORIA_TOTAL, libre: true }];
  }

  actualizar_ui();
}

/**
 * función que se llama al hacer clic en el botón "agregar a memoria".
 */
function agregar_programa() {
  const metodo = document.querySelector("input[name='metodo']:checked").value;
  const clave_programa = document.getElementById("programaSelect").value;
  const programa = programas[clave_programa];
  const tamano_proceso = programa.tamano;

  // creamos un id único para esta instancia del programa.
  const pid = `${programa.nombre}-${contador_pid++}`;
  
  if (metodo === "fijo") {
    asignar_memoria_estatica_fija(pid, tamano_proceso);
  }
  
  // al final, siempre actualizamos la interfaz.
  actualizar_ui();
}

/**
 * libera una partición de memoria buscando por el id del proceso.
 */
function liberar_programa_por_pid() {
    const pid_a_liberar = document.getElementById("pid_a_liberar").value;
    if (!pid_a_liberar) {
        alert("Por favor, introduce un PID para liberar.");
        return;
    }

    let encontrado = false;
    memoria.forEach(bloque => {
        if (!bloque.libre && bloque.pid === pid_a_liberar) {
            bloque.libre = true;
            bloque.pid = null;
            bloque.tamano_proceso = 0;
            encontrado = true;
        }
    });

    if (!encontrado) {
        alert(`Proceso con PID "${pid_a_liberar}" no encontrado.`);
    } else {
        actualizar_ui();
    }
    document.getElementById("pid_a_liberar").value = ""; // limpiar input
}


/**
 * asigna un proceso a la primera partición estática fija libre que sea lo suficientemente grande.
 * @param {string} pid - el id del proceso a asignar.
 * @param {number} tamano_proceso - el tamaño requerido por el proceso.
 */
function asignar_memoria_estatica_fija(pid, tamano_proceso) {
  // buscamos en la memoria un bloque que esté libre y que tenga espacio suficiente.
  // esta es la implementación del algoritmo de "primer ajuste" (first-fit).
  let bloque_encontrado = null;
  for (let i = 0; i < memoria.length; i++) {
      if (memoria[i].libre && memoria[i].tamano >= tamano_proceso) {
          bloque_encontrado = memoria[i];
          break; // encontramos uno, salimos del bucle.
      }
  }

  if (bloque_encontrado) {
    // si encontramos un bloque, lo marcamos como ocupado y le asignamos el proceso.
    bloque_encontrado.libre = false;
    bloque_encontrado.pid = pid;
    bloque_encontrado.tamano_proceso = tamano_proceso; // guardamos el tamaño real para ver la fragmentación.
    console.log(`Proceso ${pid} asignado a la partición que empieza en ${bloque_encontrado.inicio}.`);
  } else {
    // si recorrimos toda la memoria y no encontramos espacio, avisamos al usuario.
    alert(`No hay una partición libre lo suficientemente grande para ${pid} (${formatear_tamano(tamano_proceso)}).`);
  }
}

// -- hacemos algunas funciones accesibles globalmente desde el html (para los botones onclick) --
window.agregar_programa = agregar_programa;
window.reiniciar_memoria = reiniciar_memoria;
window.liberar_programa_por_pid = liberar_programa_por_pid;

