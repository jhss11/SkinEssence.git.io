$(document).ready(function () {
    // Inicialmente desactiva el botón de "Finalizar compra"
    $('#finalizar').prop('disabled', true);

    const minimo = 5;
    const maximo = 10;

    // Función para calcular el costo de envío según el tipo de envío y la cantidad total
    function resumenCompra() {
        let totalCantidad = 0;
        let totalCompra = parseFloat(localStorage.getItem('totalCarrito'));

        // Iterar sobre cada clave en localStorage para sumar la cantidad de productos
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key !== 'totalCarrito' && key !== 'costoEnvio') {
                totalCantidad += parseInt(localStorage.getItem(key));
            }
        }

        const envioPostal = $('#envioPostal').is(':checked');
        const recogidaEnTieda = $('#recogidaTienda').is(':checked');
        let costoEnvio = envioPostal ? (totalCantidad <= minimo ? 2000 : totalCantidad <= maximo ? 3500 : 6000) : 0;
        localStorage.setItem('costoEnvio', costoEnvio);

        // Actualizar el total de la compra incluyendo el costo de envío o restandólo
        if (recogidaEnTieda) {
            totalCompra -= parseFloat(document.getElementById('entrega').textContent.replace('₡', '').trim());
            localStorage.setItem('totalCarrito', totalCompra);
        } else {
            totalCompra += parseInt(localStorage.getItem('costoEnvio'));;
            localStorage.setItem('totalCarrito', totalCompra);
        }

        $('#cantidades').text(totalCantidad);
        $('#entrega').text(costoEnvio); // Actualiza el costo de envío en el DOM
        $('#total').text(`₡${totalCompra}`); // Actualiza el total en el DOM
    }

    // Función para verificar la tarjeta de crédito
    async function verificarTarjeta() {
        const numeroTarjeta = $('#numeroTarjeta').val().replace(/\s+/g, '');

        if (numeroTarjeta.length < 16) {
            $('#resultadoTarjeta').text('Por favor, ingrese los 16 dígitos de la tarjeta.');
            return '';
        }

        const bin = numeroTarjeta.substring(0, 6);

        try {
            const response = await fetch(`https://data.handyapi.com/bin/${bin}`);
            const data = await response.json();

            if (data && data.Scheme) {
                let marca = data.Scheme.toUpperCase();
                let logo = (marca === 'VISA') ? 'img/visa.webp' : 'img/masterCard.png';
                let tipo = (data.Type === 'DEBIT') ? 'Débito' : 'Crédito';

                $('#resultadoTarjeta').html(`<img src="${logo}" alt="${marca}" style="height: 80px;">`);
                $('#tipoTarjeta').html(`<p><b>Tipo de tarjeta:</b> ${tipo}</p>`);

                // Habilitar el botón de "Finalizar compra" si la tarjeta es válida
                $('#finalizar').prop('disabled', false);
                return tipo;
            } else {
                $('#resultadoTarjeta').text('Tarjeta no reconocida.');
                return '';
            }
        } catch (error) {
            $('#resultadoTarjeta').text('Error al verificar la tarjeta.');
            return '';
        }
    }

    //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++Finaliza Compra++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//

    function obtenerProductosGuardados() {
        const ids = Object.keys(localStorage);
        return ids.filter(id => id !== 'totalCarrito' && id !== 'costoEnvio');
    }

    // Función para generar el PDF de la factura
    function generarPDF(productosJson, productosGuardados, totalCarrito, tipoEnvio, medioPago, costoEnvio) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const fechaActual = new Date();
        const dia = fechaActual.getDate().toString().padStart(2, '0');
        const mes = (fechaActual.getMonth() + 1).toString().padStart(2, '0');
        const año = fechaActual.getFullYear();
        const fechaFormateada = `${dia}/${mes}/${año}`;

        // Agregar el encabezado de la factura
        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.text("Factura de Compra", 14, 20);

        // Mostrar la fecha actual en el encabezado
        doc.setFont("courier", "normal");
        doc.setFontSize(12);
        doc.text(`Fecha: ${fechaFormateada}`, 150, 20);  // Coloca la fecha en la esquina superior derecha

        doc.setFont("courier", "normal");
        doc.setFontSize(12);
        doc.setTextColor(50);

        doc.text("Producto", 14, 30);
        doc.text("Cantidad", 90, 30);
        doc.text("Precio", 120, 30);
        doc.text("Subtotal", 150, 30);

        let y = 40;

        productosGuardados.forEach(idLocal => {
            const productoEncontrado = productosJson.find(producto => producto.id == idLocal);
            const cantidad = parseInt(localStorage.getItem(idLocal));
            const subtotal = cantidad * productoEncontrado.precio;

            doc.setFontSize(10);

            if (productoEncontrado.nombre.length > 30) {
                let nombre1 = productoEncontrado.nombre.substring(0, 30);
                let nombre2 = productoEncontrado.nombre.substring(30);
                doc.text(nombre1, 14, y);
                y += 10;
                doc.text(nombre2, 14, y);
            } else {
                doc.text(productoEncontrado.nombre, 14, y);
            }

            doc.setFontSize(12);
            doc.setTextColor(50);

            doc.text(cantidad.toString(), 98, y);
            doc.text(productoEncontrado.precio.toString(), 118, y);
            doc.text(subtotal.toString(), 148, y);

            y += 10;
        });

        y += 10;
        doc.setFont("times", "bold");
        doc.text("Total:", 100, y);
        doc.text(totalCarrito.toString(), 120, y);

        y += 10;
        doc.setFont("courier", "normal");
        doc.text("Tipo de Envío:", 14, y);
        doc.text(tipoEnvio, 55, y);

        y += 10;
        doc.setFont("courier", "normal");
        doc.text("Costo de Envío:", 14, y);
        doc.text(costoEnvio, 55, y);

        y += 10;

        doc.text("Medio de Pago:", 14, y);
        doc.text(medioPago, 55, y);

        doc.output('dataurlnewwindow');
    }

    // Función principal que maneja el clic en el botón de "Finalizar compra"
    async function finalizarCompra() {
        const productosGuardados = obtenerProductosGuardados();
        const totalCarrito = localStorage.getItem('totalCarrito');
        const costoEnvio = localStorage.getItem('costoEnvio');
        const medioPago = await verificarTarjeta();
        if (productosGuardados.length > 0) {
            $.getJSON("./json/products.json",  function (productosJson) {
                const tipoEnvio = document.querySelector('input[name="envio"]:checked').value;
                generarPDF(productosJson, productosGuardados, totalCarrito, tipoEnvio, medioPago, costoEnvio);
                localStorage.clear()
            }).fail(function () {
                console.error('Error al cargar el archivo JSON.');
            });
        } else {
            console.log('No hay productos guardados en el carrito.');
        }

        document.getElementById('cantidades').textContent = '';
        document.getElementById('entrega').textContent = '';
        document.getElementById('total').textContent = '';
        $('#finalizar').prop('disabled', true);
    }

    resumenCompra();

    $('input[name="envio"]').on('change', resumenCompra);

    $('#verificarTarjeta').on('click', verificarTarjeta);

    $('#finalizar').on('click', finalizarCompra);
});
