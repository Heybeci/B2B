// Dinamik Expo config katmanı — app.json OLDUĞU GİBİ okunur ve `config`
// olarak buraya gelir (Expo docs, "Configuration with app config": app.json
// önce okunur, normalize sonucu app.config.js'e aktarılır). Tüm kalıcı
// ayarlar app.json'da kalır; burada SADECE koşullu base path eklenir.
//
// EXPO_PUBLIC_BASE_PATH set edilerek export alınırsa (örn. "/b2b"),
// `expo.experiments.baseUrl` o değere ayarlanır — Expo v56 bu değeri tüm
// bundlanmış kaynak linklerinin (_expo/static/*, favicon, router path'leri)
// başına olduğu gibi ekler (bkz. docs.expo.dev/versions/v56.0.0/config/app
// → experiments.baseUrl). Değer "/" ile başlamalı, sonda "/" olmamalı.
//
// Env değişkeni YOKSA hiçbir şey değişmez → kök-mutlak path'ler (gerçek
// prod, site kökünde serve) aynen korunur.
module.exports = ({ config }) => {
  const basePath = process.env.EXPO_PUBLIC_BASE_PATH;
  if (basePath) {
    config.experiments = { ...config.experiments, baseUrl: basePath };
  }
  return config;
};
