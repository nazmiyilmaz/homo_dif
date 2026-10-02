const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const os = require('os');

const isWindows = os.platform() === 'win32';
const cSolverName = isWindows ? 'solver.exe' : 'solver';
const pythonCmd = isWindows ? 'py' : 'python3';

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME tipleri
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // CORS başlıkları
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // API: /api/solve endpoint'i
    if (pathname === '/api/solve' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                handleSolveRequest(data, res);
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, message: 'Geçersiz JSON verisi.' }));
            }
        });
        return;
    }

    // Statik dosya sunumu (public/)
    let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') safePath = '/index.html';
    const filePath = path.join(PUBLIC_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Bulunamadı');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

/**
 * Diferansiyel denklem çözüm isteğini karşılar.
 * İleride burası doğrudan C dilinde derlenen solver.exe'yi çağıracaktır.
 */
function handleSolveRequest(payload, res) {
    const cSolverPath = path.join(__dirname, cSolverName);
    
    if (!fs.existsSync(cSolverPath)) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, message: `C Motoru (${cSolverName}) bulunamadi! Lutfen once derleyin.` }));
        return;
    }

    // 1. ASAMA: C Motorunu (solver.exe) calistir
    execFile(cSolverPath, [JSON.stringify(payload)], (error, stdout, stderr) => {
        if (error) {
            console.error("C Engine Error:", stderr);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, message: 'C motoru calisirken hata olustu.' }));
            return;
        }

        try {
            const cResponse = JSON.parse(stdout);

            // Eger homojen degilse veya basarisizsa direkt C sonucunu dondur
            if (!cResponse.success || !cResponse.isHomogeneous) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(cResponse));
                return;
            }

            // 2. ASAMA: Eger homojense, integral icin Python'a gonder
            const { mode, M, N, P, Q, M_ascii, N_ascii, P_ascii, Q_ascii } = payload;
            let mAsciiStr = (mode === 'differential' ? M_ascii : P_ascii) || '';
            let nAsciiStr = (mode === 'differential' ? N_ascii : Q_ascii) || '';
            execFile(pythonCmd, ['solver.py', mode, mAsciiStr, nAsciiStr], (pyError, pyStdout, pyStderr) => {
                if (!pyError) {
                    try {
                        const pyResult = JSON.parse(pyStdout);
                        if (pyResult.success) {
                            // C'nin adimlarina Python'in gercek cozumunu ekle!
                            cResponse.steps.push({
                                title: "6. Gerçek Integral Çözümü (SymPy AI)",
                                description: "Python SymPy Yapay Zekasi integrali analitik olarak cozdu ve y ifadesini yerlestirdi!",
                                latex: pyResult.final_latex
                            });
                        }
                    } catch (e) {
                        console.error("Python Parse Error:", e);
                    }
                }
                
                // Final JSON'u frontend'e gonder
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(cResponse));
            });

        } catch (parseError) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, message: 'C ciktisi okunamadi.' }));
        }
    });
}

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Diferansiyel Denklem Çözücü Sunucusu Başlatıldı!`);
    console.log(` C MOTORU BAĞLANTISI AKTİF `);
    console.log(` Adres: http://localhost:${PORT}`);
    console.log(`====================================================`);
});
