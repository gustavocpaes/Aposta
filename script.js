const API_KEY = "b6e7deed3ecf1d330f35324625c88b46"; 
const BASE_URL = "https://v3.football.api-sports.io";
const requestOptions = { method: 'GET', headers: { "x-apisports-key": API_KEY, "x-rapidapi-key": API_KEY }, redirect: 'follow' };

// PROXY DE IMAGENS (Evita bloqueio de Hotlinking)
const proxyImg = (url) => {
    if(!url) return "";
    return `https://wsrv.nl/?url=${url.replace(/^https?:\/\//, '')}`;
};

const TOP_LEAGUES = [15, 1, 2, 3, 39, 140, 135, 78, 61, 71, 13, 9, 4];
let todosOsJogos = [];
let filtroAtual = 'all'; 
let ligaSelecionada = null; 
let jogosFavoritos = JSON.parse(localStorage.getItem('favGames')) || [];

document.addEventListener("DOMContentLoaded", () => {
    const dateObj = new Date();
    const dataHoje = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const dateInput = document.getElementById('dateFilter');
    dateInput.value = dataHoje;
    buscarJogos(dataHoje);
    dateInput.addEventListener('change', (e) => { if(e.target.value) buscarJogos(e.target.value); });
});

function toggleFav(fixtureId) {
    if(jogosFavoritos.includes(fixtureId)) { jogosFavoritos = jogosFavoritos.filter(id => id !== fixtureId); } 
    else { jogosFavoritos.push(fixtureId); }
    localStorage.setItem('favGames', JSON.stringify(jogosFavoritos));
    renderizarJogos();
}

function exportarWhatsApp() {
    const titulo = document.getElementById('match-title').innerText;
    navigator.clipboard.writeText(`🔥 *RADAR TIPSTER* 🔥\n⚽ *${titulo}*\n\n_Estatísticas e Tips extraídas pelo algoritmo_ 📊`).then(() => {
        alert("✅ Análise copiada! Pronto para colar no WhatsApp/Telegram.");
    });
}

async function buscarJogos(dataString) {
    document.getElementById('loading-radar').style.display = "block";
    document.getElementById('games-list').innerHTML = "";
    
    try {
        const response = await fetch(`${BASE_URL}/fixtures?date=${dataString}`, requestOptions);
        const data = await response.json();
        
        document.getElementById('loading-radar').style.display = "none";
        if(data.errors && Object.keys(data.errors).length > 0) {
            document.getElementById('games-list').innerHTML = `<div class="debug-error"><h3>⚠️ API Erro:</h3><pre>${JSON.stringify(data.errors, null, 2)}</pre></div>`;
            return;
        }
        if (!data.response || data.response.length === 0) {
            document.getElementById('games-list').innerHTML = `<h3>Nenhum jogo encontrado para esta data.</h3>`;
            return;
        }
        todosOsJogos = data.response;
        montarSidebarLigas();
        renderizarJogos();
    } catch (error) { document.getElementById('loading-radar').innerHTML = `<span class="stat-red">Erro de conexão.</span>`; }
}

function montarSidebarLigas() {
    const leagueList = document.getElementById('league-list');
    leagueList.innerHTML = `<div class="league-item active" onclick="filtrarPorLiga(null, this)">Todas as Ligas</div>`;
    const ligasMap = new Map();
    todosOsJogos.forEach(jogo => { if(!ligasMap.has(jogo.league.id)) ligasMap.set(jogo.league.id, jogo.league); });
    
    const ligasArray = Array.from(ligasMap.values()).sort((a, b) => {
        const aIsTop = TOP_LEAGUES.includes(a.id); const bIsTop = TOP_LEAGUES.includes(b.id);
        return (aIsTop && !bIsTop) ? -1 : (!aIsTop && bIsTop) ? 1 : a.name.localeCompare(b.name);
    });

    ligasArray.forEach(liga => { leagueList.innerHTML += `<div class="league-item" onclick="filtrarPorLiga(${liga.id}, this)"><img src="${proxyImg(liga.logo)}"> ${liga.name}</div>`; });
}

function filtrarPorLiga(idLiga, elemento = null) {
    ligaSelecionada = idLiga;
    document.querySelectorAll('.league-item').forEach(el => el.classList.remove('active'));
    if(elemento) elemento.classList.add('active'); 
    if(filtroAtual !== 'all') setFilter('all', false); else renderizarJogos();
}

function setFilter(tipo, resetLiga = true) {
    filtroAtual = tipo;
    document.getElementById('btn-tab-all').classList.toggle('active', tipo === 'all');
    document.getElementById('btn-tab-live').classList.toggle('active', tipo === 'live');
    document.getElementById('btn-tab-fav').classList.toggle('active', tipo === 'fav');
    
    if((tipo === 'live' || tipo === 'fav') && resetLiga) {
        ligaSelecionada = null;
        document.querySelectorAll('.league-item').forEach(el => el.classList.remove('active'));
    }
    renderizarJogos();
}

function renderizarJogos() {
    const grid = document.getElementById('games-list');
    grid.innerHTML = "";
    let jogosFiltrados = todosOsJogos.filter(jogo => {
        let isLive = ["1H", "2H", "HT", "LIVE", "ET", "P"].includes(jogo.fixture.status.short);
        if(filtroAtual === 'fav') return jogosFavoritos.includes(jogo.fixture.id);
        if(filtroAtual === 'live') return isLive;
        return ligaSelecionada === null || jogo.league.id === ligaSelecionada;
    });

    if(jogosFiltrados.length === 0) { grid.innerHTML = `<p style="color: var(--text-muted);">Nenhum jogo encontrado.</p>`; return; }

    jogosFiltrados.forEach(jogo => {
        const isLive = ["1H", "2H", "HT", "LIVE", "ET", "P"].includes(jogo.fixture.status.short);
        const statusInfo = isLive ? `<span class="stat-green">AO VIVO - ${jogo.fixture.status.elapsed ?? '?'}分</span>` : (jogo.fixture.status.short === "NS" ? "A Iniciar" : "Encerrado");
        const starClass = jogosFavoritos.includes(jogo.fixture.id) ? "fav-star active" : "fav-star";

        grid.innerHTML += `
            <div class="game-card">
                <span class="${starClass}" onclick="toggleFav(${jogo.fixture.id})">★</span>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 5px;"><img src="${proxyImg(jogo.league.logo)}" width="15" style="border-radius: 50%; vertical-align: middle;"> ${jogo.league.name}</div>
                <div class="game-status">${statusInfo}</div>
                
                <div class="teams">
                    <div class="team-info">
                        <img src="${proxyImg(jogo.teams.home.logo)}" width="24" style="border-radius: 50%;">
                        <span>${jogo.teams.home.name}</span>
                    </div>
                    
                    <span class="stat-green" style="padding: 0 10px;">${jogo.goals.home ?? 0} x ${jogo.goals.away ?? 0}</span>
                    
                    <div class="team-info away">
                        <span>${jogo.teams.away.name}</span>
                        <img src="${proxyImg(jogo.teams.away.logo)}" width="24" style="border-radius: 50%;">
                    </div>
                </div>

                <button class="btn-analisar" onclick="abrirMercados(${jogo.fixture.id}, '${jogo.teams.home.name}', '${jogo.teams.away.name}', '${jogo.fixture.status.short}')">Analisar Jogo</button>
            </div>
        `;
    });
}

function abrirMercados(fixtureId, homeName, awayName, statusShort) {
    document.getElementById('tela-radar').style.display = 'none';
    if(window.innerWidth <= 768) document.getElementById('tela-sidebar').style.display = 'none';
    document.getElementById('tela-mercados').style.display = 'block';
    
    const badge = statusShort === 'NS' ? `<span class="pre-match-badge">Análise Pré-Jogo</span>` : `<span class="pre-match-badge" style="background:var(--win)">Estatísticas Ao Vivo</span>`;
    document.getElementById('match-title').innerHTML = `${homeName} x ${awayName} ${badge}`;
    
    document.getElementById('dados-mercado').style.display = 'none';
    
    if(statusShort === 'NS') {
        buscarPreJogo(fixtureId, homeName, awayName);
    } else {
        buscarAoVivo(fixtureId);
    }
}

function voltarParaRadar() {
    document.getElementById('tela-radar').style.display = 'block';
    if(window.innerWidth > 768) document.getElementById('tela-sidebar').style.display = 'block';
    document.getElementById('tela-mercados').style.display = 'none';
}

// ==========================================
// MODO 1: ANÁLISE PRÉ-JOGO
// ==========================================
async function buscarPreJogo(fixtureId, homeName, awayName) {
    const loading = document.getElementById('loading-mercados');
    const container = document.getElementById('dados-mercado');
    loading.style.display = "block";
    container.innerHTML = "";

    try {
        const response = await fetch(`${BASE_URL}/predictions?fixture=${fixtureId}`, requestOptions);
        const data = await response.json();
        loading.style.display = "none";

        if(!data.response || data.response.length === 0) {
            container.innerHTML = `<div class="debug-error">Sem histórico ou previsões disponíveis para este jogo ainda.</div>`;
            container.style.display = "block";
            return;
        }

        const pred = data.response[0];
        const homeForm = pred.teams.home.league.form || "?????";
        const awayForm = pred.teams.away.league.form || "?????";
        
        const formatForm = (formStr) => { return formStr.split('').map(char => `<span class="form-badge form-${char}">${char}</span>`).join(''); };

        const percHome = pred.predictions.percent.home;
        const percDraw = pred.predictions.percent.draw;
        const percAway = pred.predictions.percent.away;
        
        const tipAdvice = pred.predictions.advice || "Sem indicação clara.";
        const tipGoals = pred.predictions.under_over || "N/A";
        const tipBtts = pred.predictions.btts ? "SIM" : "NÃO";

        let h2hHtml = "";
        if(pred.h2h && pred.h2h.length > 0) {
            h2hHtml = pred.h2h.slice(0, 5).map(jogo => {
                return `<tr>
                            <td><img src="${proxyImg(jogo.teams.home.logo)}" width="16" style="vertical-align:middle; border-radius:50%;"> ${jogo.teams.home.name}</td>
                            <td style="text-align:center; font-weight:bold;">${jogo.goals.home ?? 0} - ${jogo.goals.away ?? 0}</td>
                            <td><img src="${proxyImg(jogo.teams.away.logo)}" width="16" style="vertical-align:middle; border-radius:50%;"> ${jogo.teams.away.name}</td>
                        </tr>`;
            }).join('');
        } else { h2hHtml = `<tr><td colspan="3" style="text-align:center;">Sem confrontos diretos recentes.</td></tr>`; }

        container.innerHTML = `
            <h2 style="font-size: 1.2rem; margin-bottom: 10px; color: var(--green-bet);">🤖 Inteligência Artificial (Robô Tipster)</h2>
            <div class="robot-box">
                <p style="font-size: 1.1rem;"><strong>🔥 Sugestão de Entrada:</strong> <span style="text-transform: uppercase;">${tipAdvice}</span></p>
                <p style="color: var(--text-muted); font-size: 0.9rem;"><strong>⚽ Expectativa de Golos (Over/Under):</strong> ${tipGoals}</p>
                <p style="color: var(--text-muted); font-size: 0.9rem;"><strong>🥅 Ambas as Equipas Marcam (BTTS):</strong> ${tipBtts}</p>
            </div>

            <div class="market-blocks">
                <div class="market-card">
                    <h3 style="display:flex; align-items:center; justify-content:center; gap:8px;">
                        <img src="${proxyImg(pred.teams.home.logo)}" width="20" style="border-radius:50%;"> Últimos 5: ${homeName}
                    </h3>
                    <div>${formatForm(homeForm)}</div>
                </div>
                <div class="market-card">
                    <h3 style="display:flex; align-items:center; justify-content:center; gap:8px;">
                        <img src="${proxyImg(pred.teams.away.logo)}" width="20" style="border-radius:50%;"> Últimos 5: ${awayName}
                    </h3>
                    <div>${formatForm(awayForm)}</div>
                </div>
            </div>

            <h2 style="font-size: 1.1rem; margin-bottom: 10px; color: var(--text-muted);">Probabilidades Matemáticas</h2>
            <div class="market-card" style="margin-bottom: 20px;">
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:bold;">
                    <span style="color:var(--win)">Casa (${percHome})</span>
                    <span style="color:var(--draw)">Empate (${percDraw})</span>
                    <span style="color:var(--red-bet)">Fora (${percAway})</span>
                </div>
                <div class="prob-bar">
                    <div class="prob-home" style="width: ${percHome};"></div>
                    <div class="prob-draw" style="width: ${percDraw};"></div>
                    <div class="prob-away" style="width: ${percAway};"></div>
                </div>
            </div>

            <h2 style="font-size: 1.1rem; margin-bottom: 10px; color: var(--text-muted);">Confronto Direto (Últimos Jogos)</h2>
            <div class="table-container">
                <table>
                    <thead><tr><th>Equipa da Casa</th><th style="text-align:center;">Resultado</th><th>Equipa Visitante</th></tr></thead>
                    <tbody>${h2hHtml}</tbody>
                </table>
            </div>
        `;
        container.style.display = "block";

    } catch (e) { loading.innerHTML = `<span class="stat-red">Erro ao buscar dados pré-jogo.</span>`; }
}

// ==========================================
// MODO 2: ESTATÍSTICAS AO VIVO
// ==========================================
async function buscarAoVivo(fixtureId) {
    const loading = document.getElementById('loading-mercados');
    const container = document.getElementById('dados-mercado');
    loading.style.display = "block";
    container.innerHTML = `
        <div class="market-blocks" id="team-stats-container"></div>
        <h2 style="font-size: 1.1rem; margin-bottom: 10px; color: var(--text-muted);">Mercado de Jogadores (Player Props)</h2>
        <div class="table-container">
            <table id="players-table">
                <thead><tr><th style="text-align:center;">Clube</th><th>Jogador</th><th>Pos</th><th>Chutes Alvo</th><th>Faltas</th><th>Cartões</th><th>Defesas</th></tr></thead>
                <tbody id="players-list"></tbody>
            </table>
        </div>`;

    try {
        const [respPlayers, respTeam] = await Promise.all([
            fetch(`${BASE_URL}/fixtures/players?fixture=${fixtureId}`, requestOptions),
            fetch(`${BASE_URL}/fixtures/statistics?fixture=${fixtureId}`, requestOptions)
        ]);
        
        const dataPlayers = await respPlayers.json();
        const dataTeam = await respTeam.json();
        loading.style.display = "none";
        container.style.display = "block";

        const teamStatsContainer = document.getElementById('team-stats-container');
        const playersTable = document.getElementById('players-list');

        if(dataTeam.response && dataTeam.response.length === 2) {
            dataTeam.response.forEach(time => {
                const getStat = (type) => { const s = time.statistics.find(x => x.type === type); return s ? (s.value !== null ? s.value : 0) : 0; };
                teamStatsContainer.innerHTML += `
                    <div class="market-card">
                        <h3 style="display:flex; align-items:center; justify-content:center; gap:10px;">
                            <img src="${proxyImg(time.team.logo)}" width="28" style="border-radius: 5px;">
                            ${time.team.name}
                        </h3>
                        <p>Escanteios: <span class="stat-green" style="font-weight:bold">${getStat("Corner Kicks")}</span></p>
                        <p>Cartões: <span class="stat-red" style="font-weight:bold">${getStat("Yellow Cards")}🟨 ${getStat("Red Cards")}🟥</span></p>
                    </div>`;
            });
        } else { teamStatsContainer.innerHTML = "<p>Sem dados coletivos no momento.</p>"; }

        if(dataPlayers.response && dataPlayers.response.length > 0) {
            dataPlayers.response.forEach(time => {
                time.players.forEach(p => {
                    const stats = p.statistics[0]; 
                    if(stats.games.minutes > 0) {
                        const shotsOn = stats.shots.on ?? 0;
                        const cards = (stats.cards.yellow > 0 ? "🟨" : "") + (stats.cards.red > 0 ? "🟥" : "");
                        playersTable.innerHTML += `
                            <tr>
                                <td style="text-align:center;"><img src="${proxyImg(time.team.logo)}" width="22" style="border-radius: 50%;" title="${time.team.name}"></td>
                                <td><strong>${p.player.name}</strong></td>
                                <td style="color:var(--text-muted);">${stats.games.position}</td>
                                <td class="${shotsOn > 0 ? 'highlight-chute' : 'stat-red'}">${shotsOn}</td>
                                <td>${stats.fouls.committed ?? 0}</td>
                                <td>${cards === "" ? "-" : cards}</td>
                                <td class="${stats.games.position === 'G' && stats.goals.saves > 0 ? 'highlight-defesa' : ''}">${stats.games.position === 'G' ? (stats.goals.saves ?? 0) : '-'}</td>
                            </tr>`;
                    }
                });
            });
        } else { playersTable.innerHTML = "<tr><td colspan='7' style='text-align:center;'>Dados de jogadores indisponíveis no momento.</td></tr>"; }
    } catch (e) { loading.innerHTML = `<span class="stat-red">Erro crítico ao carregar estatísticas.</span>`; }
}