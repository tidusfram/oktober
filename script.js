const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const keyWarning = document.getElementById('key-warning');

// Riwayat percakapan multi-turn sesuai format materi slide 37 & 29
let conversation = [];

// Cek status API Key di backend saat pertama dibuka
async function checkServerStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (!data.apiKeyConfigured) {
      keyWarning.style.display = 'block';
    } else {
      keyWarning.style.display = 'none';
    }
  } catch (err) {
    console.warn('Backend server belum terhubung atau port berbeda.');
  }
}
checkServerStatus();

// Fungsi menambahkan bubble pesan ke chatBox
function appendMessage(role, text, isThinking = false) {
  // Hapus welcome card jika masih ada
  const welcomeCard = chatBox.querySelector('.welcome-card');
  if (welcomeCard) {
    welcomeCard.remove();
  }

  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role} ${isThinking ? 'thinking' : ''}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (isThinking) {
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    const textSpan = document.createElement('span');
    textSpan.textContent = ' Gemini sedang berpikir...';
    bubble.appendChild(spinner);
    bubble.appendChild(textSpan);
  } else {
    bubble.textContent = text;
  }

  msgDiv.appendChild(bubble);
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  return { msgDiv, bubble };
}

// Event submit form
form.addEventListener('submit', async function (e) {
  e.preventDefault();
  const userMessage = input.value.trim();
  if (!userMessage) return;

  // 1. Tambahkan pesan user ke UI
  appendMessage('user', userMessage);
  input.value = '';

  // 2. Tambahkan ke histori percakapan
  conversation.push({ role: 'user', text: userMessage });

  // 3. Tampilkan indikator berpikir sementara (Thinking...)
  const thinkingNode = appendMessage('bot', '', true);

  // Disable tombol kirim sementara
  sendBtn.disabled = true;

  try {
    // 4. Kirim request POST ke /api/chat sesuai spesifikasi materi
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ conversation })
    });

    const data = await response.json();

    // 5. Ganti pesan "Thinking..." dengan respons AI
    thinkingNode.msgDiv.classList.remove('thinking');

    if (response.ok && data.result) {
      thinkingNode.bubble.textContent = data.result;
      // Simpan balasan AI ke riwayat
      conversation.push({ role: 'model', text: data.result });
    } else {
      thinkingNode.msgDiv.classList.add('error');
      const errText = data.error || 'Maaf, tidak ada respons yang diterima dari server.';
      thinkingNode.bubble.textContent = `❌ ${errText}`;
      // Jika error, hapus prompt user terakhir dari riwayat agar tidak merusak konteks
      conversation.pop();
    }
  } catch (error) {
    thinkingNode.msgDiv.classList.remove('thinking');
    thinkingNode.msgDiv.classList.add('error');
    thinkingNode.bubble.textContent = '❌ Gagal terhubung ke server backend (http://localhost:3000). Pastikan server aktif!';
    conversation.pop();
  } finally {
    sendBtn.disabled = false;
    input.focus();
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});

// Event klik saran prompt (sample prompts chips)
document.addEventListener('click', function (e) {
  if (e.target && e.target.classList.contains('chip')) {
    const prompt = e.target.getAttribute('data-prompt');
    if (prompt) {
      input.value = prompt;
      input.focus();
    }
  }
});

// Tombol reset/clear percakapan
if (clearBtn) {
  clearBtn.addEventListener('click', function () {
    conversation = [];
    chatBox.innerHTML = `
      <div class="welcome-card">
        <div class="welcome-icon">👋</div>
        <h3>Percakapan Baru</h3>
        <p>Riwayat percakapan telah dibersihkan. Silakan tanyakan hal baru!</p>
        <div class="sample-prompts">
          <button class="chip" data-prompt="Jelaskan cara kerja API AI secara singkat">"Cara kerja API AI"</button>
          <button class="chip" data-prompt="Buatkan rekomendasi rencana perjalanan 3 hari di Bali">"Rencana liburan Bali 3 hari"</button>
          <button class="chip" data-prompt="Apa bedanya temperature, top_p, dan top_k pada Gemini?">"Parameter Gemini"</button>
        </div>
      </div>
    `;
  });
}
