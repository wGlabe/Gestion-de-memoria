// -- constantes y estado global --

// la memoria total del sistema es de 16 mib (2^24 bytes).
const MEMORIA_TOTAL = 16 * 1024 * 1024; 

// escala para la visualización. cada pixel en la barra representará esta cantidad de bytes.
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

document.addEventListener("DOMContentLoaded", () => {
  // llenamos el menú desplegable con los programas que definimos arriba.
  const selector = document.getElementById("programaSelect");
  selector.innerHTML = "";
  
  Object.keys(programas).forEach(clave => {
    const opcion = document.createElement("option");
    opcion.value = clave;
    const programa = programas[clave];
    opcion.textContent = `${programa.nombre} (${formatear_tamano(programa.tamano)})`;
    selector.appendChild(opcion);
  });

  // si el usuario cambia de método, la memoria se reiniciará automáticamente.
  document.querySelectorAll("input[name='metodo']").forEach(radio => {
    radio.addEventListener("change", reiniciar_memoria);
  });

  // al cargar la página por primera vez, inicializamos la memoria.
  reiniciar_memoria();
});


// -- funciones de utilidad (helpers) --

function formatear_tamano(tamano_en_bytes) {
  if (tamano_en_bytes >= 1024 * 1024) {
    return (tamano_en_bytes / (1024 * 1024)).toFixed(2) + " MiB";
  }
  return (tamano_en_bytes / 1024).toFixed(0) + " KiB";
}

function a_hex(numero) {
    return `0x${numero.toString(16).toUpperCase().padStart(6, '0')}`;
}


// -- funciones de renderizado (dibujar en pantalla) --

function actualizar_ui() {
  dibujar_barra_memoria();
  dibujar_tabla_particiones();
}

function dibujar_barra_memoria() {
  const contenedor = document.getElementById("memoria");
  contenedor.innerHTML = "";

  memoria.forEach(bloque => {
    const div_bloque = document.createElement("div");
    
    const flexibilidad = Math.max(bloque.tamano / ESCALA_GRAFICA, 0.2);
    div_bloque.style.flex = flexibilidad;

    div_bloque.className = bloque.libre ? "bg-green-500" : "bg-red-500";
    div_bloque.className += " border-r-2 border-gray-800 text-white text-xs text-center overflow-hidden p-1 flex items-center justify-center";
    div_bloque.title = `Base: ${a_hex(bloque.inicio)}\nTamaño: ${formatear_tamano(bloque.tamano)}`;
    
    div_bloque.style.whiteSpace = "pre-line";
    if (bloque.libre) {
        div_bloque.innerText = `Libre\n${formatear_tamano(bloque.tamano)}`;
    } else {
        const frag_interna = bloque.tamano - bloque.tamano_proceso;
        div_bloque.innerText = `${bloque.pid}\n(${formatear_tamano(bloque.tamano_proceso)})`;
        div_bloque.title += `\nProceso: ${bloque.pid}\nTamaño Real: ${formatear_tamano(bloque.tamano_proceso)}\nFrag. Interna: ${formatear_tamano(frag_interna)}`;
    }
    
    contenedor.appendChild(div_bloque);
  });
}

function dibujar_tabla_particiones() {
  const cuerpo_tabla = document.querySelector("#tabla_particiones tbody");
  cuerpo_tabla.innerHTML = "";

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

function reiniciar_memoria() {
  contador_pid = 1;
  const metodo = document.querySelector("input[name='metodo']:checked").value;

  if (metodo === "fijo") {
    // para particiones fijas, dividimos la memoria en bloques iguales.
    memoria = [];
    let tamano_particion = 2 * 1024 * 1024;
    const numero_particiones = Math.floor(MEMORIA_TOTAL / tamano_particion);

    for (let i = 0; i < numero_particiones; i++) {
      memoria.push({
        inicio: i * tamano_particion,
        tamano: tamano_particion,
        libre: true,
        pid: null,
        tamano_proceso: 0
      });
    }
  } else if (metodo === "variable") {
    // para particiones variables, definimos tamaños predeterminados que suman el total.
    memoria = [];
    // ejemplo de tamaños (en mib) que suman 16: 1 + 2 + 3 + 4 + 6 = 16 mib.
    const tamanos_particiones = [1, 2, 3, 4, 6].map(mib => mib * 1024 * 1024);
    let inicio_actual = 0;

    tamanos_particiones.forEach(tamano => {
        memoria.push({
            inicio: inicio_actual,
            tamano: tamano,
            libre: true,
            pid: null,
            tamano_proceso: 0
        });
        inicio_actual += tamano;
    });
  } else {
    // aquí irá la lógica para los otros métodos en el futuro.
    memoria = [{ inicio: 0, tamano: MEMORIA_TOTAL, libre: true, pid: null, tamano_proceso: 0 }];
  }

  actualizar_ui();
}

function agregar_programa() {
  const metodo = document.querySelector("input[name='metodo']:checked").value;
  const clave_programa = document.getElementById("programaSelect").value;
  const programa = programas[clave_programa];
  const tamano_proceso = programa.tamano;

  const pid = `${programa.nombre}-${contador_pid++}`;
  
  if (metodo === "fijo" || metodo === "variable") {
    asignar_memoria_estatica(pid, tamano_proceso);
  }
  
  actualizar_ui();
}

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
    document.getElementById("pid_a_liberar").value = "";
}


/**
 * asigna un proceso a la primera partición estática (fija o variable) libre que sea lo suficientemente grande.
 * @param {string} pid - el id del proceso a asignar.
 * @param {number} tamano_proceso - el tamaño requerido por el proceso.
 */
function asignar_memoria_estatica(pid, tamano_proceso) {
  // buscamos en la memoria un bloque que esté libre y que tenga espacio suficiente (primer ajuste).
  let bloque_encontrado = null;
  for (let i = 0; i < memoria.length; i++) {
      if (memoria[i].libre && memoria[i].tamano >= tamano_proceso) {
          bloque_encontrado = memoria[i];
          break;
      }
  }

  if (bloque_encontrado) {
    bloque_encontrado.libre = false;
    bloque_encontrado.pid = pid;
    bloque_encontrado.tamano_proceso = tamano_proceso;
    console.log(`Proceso ${pid} asignado a la partición que empieza en ${bloque_encontrado.inicio}.`);
  } else {
    alert(`No hay una partición libre lo suficientemente grande para ${pid} (${formatear_tamano(tamano_proceso)}).`);
  }
}

// -- hacemos algunas funciones accesibles globalmente desde el html --
window.agregar_programa = agregar_programa;
window.reiniciar_memoria = reiniciar_memoria;
window.liberar_programa_por_pid = liberar_programa_por_pid;
