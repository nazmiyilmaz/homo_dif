// Frontend Mantığı ve Etkileşimler
let currentMode = 'differential'; // 'differential' veya 'derivative'

// DOM Elemanları
const tabDiff = document.getElementById('tabDiff');
const tabDeriv = document.getElementById('tabDeriv');
const differentialInputs = document.getElementById('differentialInputs');
const derivativeInputs = document.getElementById('derivativeInputs');

// math-field elementleri
const inputM = document.getElementById('inputM');
const inputN = document.getElementById('inputN');
const inputP = document.getElementById('inputP');
const inputQ = document.getElementById('inputQ');

const equationPreview = document.getElementById('equationPreview');
const resultContainer = document.getElementById('resultContainer');
const solveBtn = document.getElementById('solveBtn');

// Mod Değiştirme (Sekmeler)
window.switchMode = function(mode) {
    currentMode = mode;
    if (mode === 'differential') {
        tabDiff.classList.add('active');
        tabDeriv.classList.remove('active');
        differentialInputs.classList.remove('hidden');
        derivativeInputs.classList.add('hidden');
    } else {
        tabDeriv.classList.add('active');
        tabDiff.classList.remove('active');
        derivativeInputs.classList.remove('hidden');
        differentialInputs.classList.add('hidden');
    }
    updatePreview();
}

// Canlı Önizleme Güncellemesi
function updatePreview() {
    let latex = '';
    if (currentMode === 'differential') {
        const mVal = inputM.value || 'M(x,y)';
        const nVal = inputN.value || 'N(x,y)';
        latex = `$$(${mVal})\\,dx + (${nVal})\\,dy = 0$$`;
    } else {
        const pVal = inputP.value || 'P(x,y)';
        const qVal = inputQ.value || 'Q(x,y)';
        latex = `$$\\frac{dy}{dx} = \\frac{${pVal}}{${qVal}}$$`;
    }

    equationPreview.innerHTML = latex;
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([equationPreview]).catch(err => console.log(err));
    }
}

// Hazır Örnekleri Yükleme
window.loadExample = function(index) {
    if (index === 1) {
        switchMode('differential');
        inputM.value = 'x^2 + y^2';
        inputN.value = '-2xy';
    } else if (index === 2) {
        switchMode('differential');
        inputM.value = 'x + y';
        inputN.value = '-x';
    } else if (index === 3) {
        switchMode('differential');
        inputM.value = 'x^2 + y';
        inputN.value = 'x';
    } else if (index === 4) {
        switchMode('differential');
        inputM.value = '\\sqrt{x}';
        inputN.value = 'y^2';
    }
    updatePreview();
    solveEquation();
}

// Çözüm İsteği Gönderme
window.solveEquation = async function() {
    resultContainer.classList.remove('hidden');

    // Boş Girdi Validasyonu
    let mVal = '', nVal = '';
    if (currentMode === 'differential') {
        mVal = inputM.value.trim();
        nVal = inputN.value.trim();
        if (!mVal || !nVal) {
            resultContainer.innerHTML = `
                <div class="p-6 rounded-2xl bg-amber-950/30 border border-amber-600/50 text-amber-200 space-y-3 animate-fade-in shadow-xl">
                    <div class="flex items-center gap-3">
                        <div class="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                            <i data-lucide="alert-circle" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg text-amber-300">Eksik Denklem</h3>
                            <p class="text-sm text-amber-200/80">Lütfen M(x,y) ve N(x,y) alanlarının ikisini de doldurun. (Katsayı 1 ise '1' yazabilirsiniz).</p>
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }
    } else {
        mVal = inputP.value.trim();
        nVal = inputQ.value.trim();
        if (!mVal || !nVal) {
            resultContainer.innerHTML = `
                <div class="p-6 rounded-2xl bg-amber-950/30 border border-amber-600/50 text-amber-200 space-y-3 animate-fade-in shadow-xl">
                    <div class="flex items-center gap-3">
                        <div class="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                            <i data-lucide="alert-circle" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-lg text-amber-300">Eksik Denklem</h3>
                            <p class="text-sm text-amber-200/80">Lütfen Pay ve Payda kısımlarının ikisini de doldurun.</p>
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }
    }

    resultContainer.innerHTML = `
        <div class="p-8 rounded-2xl bg-slate-800/80 border border-slate-700 text-center space-y-4 animate-pulse">
            <div class="inline-block w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-sm text-slate-300">Denklem analiz ediliyor ve C motoruna aktarılıyor...</p>
        </div>
    `;

    const payload = {
        mode: currentMode,
        M: inputM.value,
        N: inputN.value,
        P: inputP.value,
        Q: inputQ.value,
        M_ascii: inputM.getValue('ascii-math'),
        N_ascii: inputN.getValue('ascii-math'),
        P_ascii: inputP.getValue('ascii-math'),
        Q_ascii: inputQ.getValue('ascii-math')
    };

    try {
        const response = await fetch('/api/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        renderResult(data);
    } catch (err) {
        resultContainer.innerHTML = `
            <div class="p-6 rounded-2xl bg-rose-950/40 border border-rose-700/50 text-rose-300 space-y-2">
                <h3 class="font-bold text-base flex items-center gap-2">
                    <i data-lucide="alert-triangle" class="w-5 h-5 text-rose-400"></i>
                    Bağlantı Hatası
                </h3>
                <p class="text-sm">Sunucuyla iletişim kurulurken bir hata oluştu: ${err.message}</p>
            </div>
        `;
        lucide.createIcons();
    }
}

// Sonuçları Ekrana Basma
function renderResult(data) {
    if (!data.success && data.isFirstOrder === false) {
        resultContainer.innerHTML = `
            <div class="p-6 rounded-2xl bg-amber-950/30 border border-amber-600/50 text-amber-200 space-y-3 animate-fade-in shadow-xl">
                <div class="flex items-center gap-3">
                    <div class="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                        <i data-lucide="shield-alert" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg text-amber-300">Geçersiz Diferansiyel Denklem Mertebesi</h3>
                        <p class="text-sm text-amber-200/80">${data.message}</p>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    if (!data.isHomogeneous) {
        resultContainer.innerHTML = `
            <div class="p-8 rounded-2xl bg-rose-950/40 border border-rose-600/60 text-white space-y-4 animate-fade-in shadow-2xl">
                <div class="flex items-start gap-4">
                    <div class="p-3 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                        <i data-lucide="ban" class="w-8 h-8"></i>
                    </div>
                    <div class="space-y-2">
                        <div class="inline-block px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold tracking-wider uppercase border border-rose-500/30">
                            Homojenlik Şartı Sağlanamadı
                        </div>
                        <h2 class="text-2xl font-extrabold text-rose-400 tracking-tight">
                            "homojen değil bu teknikle çözemeyiz"
                        </h2>
                        <p class="text-sm text-slate-300 leading-relaxed">
                            ${data.reason || 'Denklemdeki terimlerin dereceleri eşit değildir.'}
                        </p>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // HOMOJEN DENKLEM - ADIM ADIM ÇÖZÜM
    let stepsHtml = '';
    data.steps.forEach((step, index) => {
        stepsHtml += `
            <div class="step-card bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 space-y-3">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-950/60 px-3 py-1 rounded-lg border border-sky-800/50">
                        ${step.title}
                    </span>
                    <span class="text-xs text-slate-500">Adım ${index + 1}</span>
                </div>
                <p class="text-sm text-slate-300">${step.description}</p>
                <div class="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto text-sky-100 font-mono text-center">
                    $$${step.latex}$$
                </div>
            </div>
        `;
    });

    resultContainer.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <div class="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-600/50 flex items-center justify-between flex-wrap gap-4 shadow-xl">
                <div class="flex items-center gap-3">
                    <div class="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <i data-lucide="check-circle-2" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-lg text-emerald-300">1. Dereceden Homojen Denklem Doğrulandı</h3>
                        <p class="text-xs text-emerald-400/80">Homojenlik Derecesi: $k = ${data.degree || 1}$ (y = vx dönüşümü ile çözülüyor)</p>
                    </div>
                </div>
                <div class="text-xs font-mono bg-slate-900/80 px-3.5 py-2 rounded-xl border border-slate-700 text-slate-300">
                    $$${data.equationLatex}$$
                </div>
            </div>
            <div class="space-y-4">
                <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <i data-lucide="list-ordered" class="w-4 h-4 text-sky-400"></i>
                    Adım Adım Çözüm Yolu
                </h4>
                ${stepsHtml}
            </div>
        </div>
    `;

    lucide.createIcons();
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([resultContainer]).catch(err => console.log(err));
    }
}

// MathLive <math-field> elementlerine input listener ekleme
customElements.whenDefined('math-field').then(() => {
    [inputM, inputN, inputP, inputQ].forEach(input => {
        if (input) {
            input.addEventListener('input', updatePreview);
        }
    });
    updatePreview();
});

// Başlangıç
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
});
