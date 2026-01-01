function standardizeIngredient(rawQty, rawUnit) {
    if (!rawQty || !rawUnit) {
        throw new Error("Miktar ve birim bilgisi zorunludur.");
    }

    // 1. Virgül Düzeltme ve Sayıya Çevirme
    // String'e çeviriyoruz ki .replace çalışsın (sayı gelirse hata vermesin)
    const qtyString = String(rawQty).replace(',', '.');
    let finalQty = parseFloat(qtyString);
    let finalUnit = rawUnit;

    if (isNaN(finalQty)) {
        throw new Error("Geçersiz miktar girişi.");
    }

    // 2. AĞIRLIK Dönüşümleri
    if (rawUnit === 'kg') {
        finalQty = finalQty * 1000;
        finalUnit = 'gram';
    } 
    else if (['g', 'gr', 'gram', 'Gr'].includes(rawUnit)) {
        finalUnit = 'gram';
    }

    // 3. HACİM Dönüşümleri
    // Kullanıcı 'L', 'lt', 'Litre' seçmiş olabilir
    else if (['L', 'lt', 'Litre', 'liter'].includes(rawUnit)) {
        finalQty = finalQty * 1000;
        finalUnit = 'ml';
    }
    else if (['ml', 'mL'].includes(rawUnit)) {
        finalUnit = 'ml';
    }

    // 4. ADET Dönüşümleri
    else if (['adet', 'count', 'piece', 'qty'].includes(rawUnit)) {
        finalUnit = 'qty';
    }

    // Virgülden sonra gereksiz uzunlukları temizle (Örn: 1500.0000 -> 1500)
    // Ancak ondalıklı gramlar (0.5 gram) kalabilir.
    finalQty = parseFloat(finalQty.toFixed(2));

    return { quantity: finalQty, unit: finalUnit };
}

module.exports = { standardizeIngredient };