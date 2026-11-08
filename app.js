// Public WebSocket Endpoint (No PAT, No App ID required)[span_4](start_span)[span_4](end_span)
const PUBLIC_WS_URL = 'wss://api.derivws.com/trading/v1/options/ws/public';

let ws = null;
let currentSymbol = 'R_100';
let tickHistory = [];

document.addEventListener('DOMContentLoaded', () => {
    initWebSocket();
    document.getElementById('marketSelect').addEventListener('change', onSymbolChange);
});

// 1. Connect to Public WebSocket Stream[span_5](start_span)[span_5](end_span)
function initWebSocket() {
    ws = new WebSocket(PUBLIC_WS_URL);

    ws.onopen = () => {
        updateConnectionStatus(true, 'Connected (Public)');
        // Request active symbols on open[span_6](start_span)[span_6](end_span)
        ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic' }));
        subscribeToSymbolTicks(currentSymbol);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data);
    };

    ws.onclose = () => {
        updateConnectionStatus(false, 'Disconnected');
        setTimeout(initWebSocket, 3000);
    };

    ws.onerror = () => updateConnectionStatus(false, 'Connection Error');
}

// 2. Process incoming websocket responses[span_7](start_span)[span_7](end_span)
function handleMessage(data) {
    const msgType = data.msg_type;

    if (msgType === 'active_symbols') {
        populateSymbolDropdown(data.active_symbols);
    } else if (msgType === 'tick') {
        processTick(data.tick);
    }
}

// 3. Populate Active Symbols using returned underlying_symbol[span_8](start_span)[span_8](end_span)
function populateSymbolDropdown(symbols) {
    const select = document.getElementById('marketSelect');
    select.innerHTML = '';

    const validSymbols = symbols.filter(s => s.market === 'synthetic_index' || s.market === 'forex');

    validSymbols.forEach(symbol => {
        const option = document.createElement('option');
        option.value = symbol.symbol; // underlying_symbol[span_9](start_span)[span_9](end_span)
        option.innerText = `${symbol.display_name} (${symbol.symbol})`;
        select.appendChild(option);
    });

    if (validSymbols.length > 0) {
        select.value = currentSymbol;
    }
}

// 4. Change symbol subscription dynamically[span_10](start_span)[span_10](end_span)
function onSymbolChange() {
    currentSymbol = document.getElementById('marketSelect').value;
    subscribeToSymbolTicks(currentSymbol);
}

function subscribeToSymbolTicks(symbol) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ forget_all: 'ticks' }));
        tickHistory = [];
        ws.send(JSON.stringify({ ticks: symbol })); // Subscribe to tick stream[span_11](start_span)[span_11](end_span)
        document.getElementById('chartSymbol').innerText = symbol;
    }
}

// 5. Read tick.quote and tick.epoch dynamically[span_12](start_span)[span_12](end_span)
function processTick(tick) {
    const quote = parseFloat(tick.quote).toFixed(tick.pip_size || 4); // tick.quote[span_13](start_span)[span_13](end_span)
    const epoch = tick.epoch; // tick.epoch[span_14](start_span)[span_14](end_span)

    document.getElementById('livePrice').innerText = quote;
    document.getElementById('liveEpoch').innerText = epoch;

    // Update historical array for chart rendering
    tickHistory.push(tick.quote);
    if (tickHistory.length > 30) tickHistory.shift();

    renderSVGChart();
    appendTickTableRow(epoch, quote);
}

// 6. SVG Chart Rendering
function renderSVGChart() {
    if (tickHistory.length < 2) return;
    const svg = document.getElementById('tickChart');
    const path = document.getElementById('chartPath');
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    const min = Math.min(...tickHistory);
    const max = Math.max(...tickHistory);
    const range = (max - min) || 1;

    const points = tickHistory.map((val, idx) => {
        const x = (idx / (tickHistory.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 20) - 10;
        return `${x},${y}`;
    });

    path.setAttribute('d', `M ${points.join(' L ')}`);
}

// 7. Add Row to Table
function appendTickTableRow(epoch, quote) {
    const tbody = document.getElementById('tickTableBody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="p-2 text-slate-400">${epoch}</td>
        <td class="p-2 text-emerald-400 font-bold">${quote}</td>
    `;
    tbody.prepend(row);

    if (tbody.children.length > 10) {
        tbody.removeChild(tbody.lastChild);
    }
}

// 8. Update UI Badge Status
function updateConnectionStatus(isConnected, text) {
    const badge = document.getElementById('connectionStatus');
    if (isConnected) {
        badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-green"></span><span class="text-emerald-400 font-mono font-semibold">${text}</span>`;
    } else {
        badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span><span class="text-rose-400 font-mono font-semibold">${text}</span>`;
    }
}
