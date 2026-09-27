const fs = require('fs');
const path = require('path');
const modalPath = path.join(__dirname, 'src/components/RequestModal.tsx');
let code = fs.readFileSync(modalPath, 'utf8');

// 1. Añadir el paso 'confirm'
code = code.replace(
  /type Step = 'menu' \| 'mensual' \| 'country';/,
  "type Step = 'menu' | 'mensual' | 'country' | 'confirm';"
);

// 2. Modificar el manejo del submit del form
code = code.replace(
  /const handleSubmit = async \(e: React\.FormEvent\) => \{[\s\S]*?e\.preventDefault\(\);/,
  `const handleCountryNext = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCountry = country === 'Otro' ? customCountry : country;
    if (!finalCountry) {
      setError('Por favor selecciona o ingresa tu país.');
      return;
    }
    setStep('confirm');
  };

  const handleSubmit = async () => {`
);

// 3. Modificar la acción del form onSubmit de 'country' a handleCountryNext
code = code.replace(
  /<form onSubmit=\{handleSubmit\} className="flex flex-col h-full space-y-5 pt-2 text-left">/,
  `<form onSubmit={handleCountryNext} className="flex flex-col h-full space-y-5 pt-2 text-left">`
);

// 4. Cambiar el texto del botón del país
code = code.replace(
  /\{submitting \? 'Notificando\.\.\.' : 'InformaciÃ³n SuscripciÃ³n VIP'\}/,
  `'Siguiente'`
);

// 5. Agregar el contenedor del paso 'confirm' justo antes del if(step === 'menu')
const confirmUI = `
        ) : step === 'confirm' ? (
          <div className="flex flex-col h-full justify-center space-y-6 pt-4 text-center">
            <div>
              <div className="w-16 h-16 mx-auto rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center mb-4">
                <Send className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase">Envío Directo</h3>
              <p className="text-sm text-zinc-300 mt-4 leading-relaxed px-2">
                ¿Aceptas enviar un mensaje directo y privado a <strong>IAM DANII VIP</strong>?
                <br /><br />
                Toda la información de los planes y formas de pago para <strong>{country === 'Otro' ? customCountry : country}</strong> te será enviada de manera 100% privada y confidencial a tu chat de Telegram.
              </p>
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 text-center">
                {error}
              </p>
            )}

            <div className="space-y-3 mt-4">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm tracking-wider uppercase transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Enviando Mensaje...' : 'Sí, Enviar Mensaje Privado'}
              </button>
              <button
                type="button"
                onClick={() => setStep('country')}
                disabled={submitting}
                className="w-full py-3 text-xs text-zinc-500 hover:text-white uppercase font-bold cursor-pointer"
              >
                Cancelar y volver atrás
              </button>
            </div>
          </div>
`;

code = code.replace(
  /\) : step === 'menu' \? \(/,
  confirmUI + "\n        ) : step === 'menu' ? ("
);

fs.writeFileSync(modalPath, code);
console.log('Parche RequestModal Confirm UI Aplicado');
