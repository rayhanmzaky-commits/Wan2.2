import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

// Membaca foto struk atau bukti transfer. Memakai Gemini bila secret GEMINI_API_KEY ada,
// kalau tidak, mengembalikan contoh hasil (simulated: true) supaya alurnya tetap bisa dicoba.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const today = () => new Date().toISOString().slice(0, 10)

const SAMPLES = [
  { type: 'expense', title: 'Indomaret', amount: 85500, category: 'Belanja Dapur' },
  { type: 'expense', title: 'SPBU Pertamina', amount: 250000, category: 'Transportasi' },
  { type: 'expense', title: 'Apotek K-24', amount: 132000, category: '' },
  { type: 'income', title: 'Transfer Gaji', amount: 12000000, category: '' },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Gunakan metode POST.' }, 405)

  let body: { image_base64?: unknown; mime?: unknown; categories?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Isi permintaan tidak valid.' }, 400)
  }
  const { image_base64, mime } = body
  if (typeof image_base64 !== 'string' || typeof mime !== 'string') {
    return json({ error: 'Kirim gambar dalam base64 beserta jenis berkasnya.' }, 400)
  }
  if (image_base64.length > 9_000_000) return json({ error: 'Berkas terlalu besar. Maksimal sekitar 6 MB.' }, 413)
  const categories = Array.isArray(body.categories) ? body.categories.filter((c): c is string => typeof c === 'string') : []

  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) {
    const s = SAMPLES[image_base64.length % SAMPLES.length]
    return json({ ...s, date: today(), simulated: true })
  }

  const prompt =
    'Kamu membaca foto struk belanja atau bukti transfer berbahasa Indonesia. Kembalikan JSON dengan isi: ' +
    "type = 'income' bila uang masuk (bukti transfer masuk, gaji), 'expense' bila belanja atau transfer keluar; " +
    'title = nama toko atau keterangan singkat; amount = total akhir dalam Rupiah sebagai bilangan bulat tanpa titik; ' +
    `date = tanggal transaksi format YYYY-MM-DD (bila tidak terbaca pakai ${today()}); ` +
    `category = pilih tepat satu dari: ${categories.join(', ') || '(tidak ada)'}, atau string kosong bila income.`

  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: image_base64 } }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            type: { type: 'STRING', enum: ['income', 'expense'] },
            title: { type: 'STRING' },
            amount: { type: 'INTEGER' },
            date: { type: 'STRING' },
            category: { type: 'STRING' },
          },
          required: ['type', 'title', 'amount', 'date', 'category'],
        },
      },
    }),
  })
  if (!res.ok) return json({ error: 'Layanan pembaca struk sedang bermasalah. Isi manual dulu.' }, 502)

  try {
    const data = await res.json()
    const parsed = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}')
    const amount = Math.round(Number(parsed.amount))
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('nominal tidak terbaca')
    return json({
      type: parsed.type === 'income' ? 'income' : 'expense',
      title: String(parsed.title ?? '').slice(0, 80),
      amount,
      date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : today(),
      category: categories.includes(parsed.category) ? parsed.category : '',
      simulated: false,
    })
  } catch {
    return json({ error: 'Isi struk belum terbaca jelas. Isi manual dulu.' }, 422)
  }
})
