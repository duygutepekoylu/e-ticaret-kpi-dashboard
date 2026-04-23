require('dotenv').config();
const jwt = require('jsonwebtoken');
const env = require('./src/config/env');

// Server is assumed to be running on port 3001


setTimeout(async () => {
  console.log('\n=======================================');
  console.log('   FAZ 8 TESTLERİ BAŞLIYOR');
  console.log('=======================================\n');

  try {
    const token = jwt.sign({ id: 1, role: 'admin', email: 'admin@sporthink.com' }, env.jwt.secret, { expiresIn: '1h' });
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    const PORT = env.app.port || 3000;
    const baseUrl = `http://localhost:${PORT}/api/v1`;

    let res, data;

    // 1. Dashboard Trend Testi
    console.log('1. Dashboard Trend Testi (/dashboard/trend)');
    res = await fetch(`${baseUrl}/dashboard/trend?date_from=2024-10-01&date_to=2024-10-31`, { headers });
    data = await res.json();
    if (data.success && Array.isArray(data.data.rows)) {
      console.log(`   ✅ Başarılı. Satır sayısı: ${data.data.rows.length}`);
    } else {
      console.log(`   ❌ Başarısız. Hata:`, data);
    }

    // 2. Dashboard Channel Performance Testi
    console.log('\n2. Dashboard Channel Performance Testi (/dashboard/channel-performance)');
    res = await fetch(`${baseUrl}/dashboard/channel-performance`, { headers });
    data = await res.json();
    if (data.success && Array.isArray(data.data.rows)) {
      console.log(`   ✅ Başarılı. Kanal sayısı: ${data.data.rows.length}`);
    } else {
      console.log(`   ❌ Başarısız. Hata:`, data);
    }

    // 3. Dashboard Funnel Testi
    console.log('\n3. Dashboard Funnel Testi (/dashboard/funnel)');
    res = await fetch(`${baseUrl}/dashboard/funnel`, { headers });
    data = await res.json();
    if (data.success && data.data.funnel && data.data.funnel.length === 6) {
      console.log(`   ✅ Başarılı. 6 adımlı funnel sırayla dönüyor mu?`);
      data.data.funnel.forEach(step => {
        console.log(`      Adım ${step.step} (${step.name}): ${step.value} (Drop-off: %${(step.rate*100).toFixed(1)})`);
      });
    } else {
      console.log(`   ❌ Başarısız. Hata:`, data);
    }

    // 4. Filters Testi
    console.log('\n4. Filters Testi (/filters/channels)');
    res = await fetch(`${baseUrl}/filters/channels`, { headers });
    data = await res.json();
    if (data.success && Array.isArray(data.data.channels)) {
      console.log(`   ✅ Başarılı. Siparişlerdeki benzersiz kanal sayısı: ${data.data.channels.length}`);
    } else {
      console.log(`   ❌ Başarısız. Hata:`, data);
    }

    // 5. Views CRUD Testi
    console.log('\n5. Views (Kayıtlı Görünümler) Döngü Testi');
    res = await fetch(`${baseUrl}/views`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Test Dashboard Görünümü', layout: { widgets: 5 } })
    });
    data = await res.json();
    if (data.success && data.data.id) {
      const viewId = data.data.id;
      console.log(`   ✅ Görünüm oluşturuldu (ID: ${viewId})`);
      
      res = await fetch(`${baseUrl}/views/${viewId}`, { headers });
      data = await res.json();
      if (data.success && data.data.view.id === viewId) {
        console.log(`   ✅ Görünüm getirildi (İsim: ${data.data.view.name})`);
        
        res = await fetch(`${baseUrl}/views/${viewId}`, { method: 'DELETE', headers });
        data = await res.json();
        if (data.success && data.data.deleted) {
          console.log(`   ✅ Görünüm silindi`);
        } else {
          console.log(`   ❌ Silme başarısız.`);
        }
      } else {
        console.log(`   ❌ Getirme başarısız.`);
      }
    } else {
      console.log(`   ❌ Oluşturma başarısız. Hata:`, data);
    }

    // 6. Segments CRUD Testi
    console.log('\n6. Segments (Kullanıcı Segmentleri) Döngü Testi');
    res = await fetch(`${baseUrl}/segments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Test VIP Segment', rules: { channel: 'Paid Social' } })
    });
    data = await res.json();
    if (data.success && data.data.id) {
      const segmentId = data.data.id;
      console.log(`   ✅ Segment oluşturuldu (ID: ${segmentId})`);
      
      res = await fetch(`${baseUrl}/segments/${segmentId}/preview`, { headers });
      data = await res.json();
      if (data.success) {
        console.log(`   ✅ Segment önizleme yapıldı (Eşleşen Sipariş: ${data.data.matching_orders}, Müşteri: ${data.data.matching_customers})`);
        
        res = await fetch(`${baseUrl}/segments/${segmentId}`, { method: 'DELETE', headers });
        data = await res.json();
        if (data.success && data.data.deleted) {
          console.log(`   ✅ Segment silindi`);
        } else {
          console.log(`   ❌ Silme başarısız.`);
        }
      } else {
        console.log(`   ❌ Önizleme başarısız. Hata:`, data);
      }
    } else {
      console.log(`   ❌ Oluşturma başarısız. Hata:`, data);
    }

    // 7. Export Testi
    console.log('\n7. Export Testi (/export?table=kpi_daily_traffic)');
    res = await fetch(`${baseUrl}/export?table=kpi_daily_traffic`, { headers });
    data = await res.json();
    if (data.success && data.data.table === 'kpi_daily_traffic') {
      console.log(`   ✅ Başarılı. Dışa aktarılan veri boyutu: ${data.data.rows.length} satır`);
    } else {
      console.log(`   ❌ Başarısız. Hata:`, data);
    }

    // 8. Logs Testi
    console.log('\n8. Logs (Audit Logları) Testi (/logs/audit)');
    res = await fetch(`${baseUrl}/logs/audit`, { headers });
    data = await res.json();
    if (data.success && Array.isArray(data.data.logs)) {
      console.log(`   ✅ Başarılı. Getirilen son işlem (log) sayısı: ${data.data.logs.length}`);
    } else {
      console.log(`   ❌ Başarısız. Hata:`, data);
    }

    // 9. Swagger Dokümantasyon Testi
    console.log('\n9. Swagger API Dokümantasyonu Testi (/docs/spec)');
    res = await fetch(`${baseUrl}/docs/spec`);
    data = await res.json();
    if (data.openapi === '3.0.0' && data.paths) {
      console.log(`   ✅ Başarılı. API Endpoint Sayısı: ${Object.keys(data.paths).length}`);
    } else {
      console.log(`   ❌ Başarısız.`);
    }

    console.log('\n=======================================');
    console.log('   TÜM TESTLER TAMAMLANDI');
    console.log('=======================================\n');

    process.exit(0);

  } catch (error) {
    console.error('Beklenmeyen bir hata oluştu:', error);
    process.exit(1);
  }
}, 3000);
