function calculateRequiredAmount(baseAmount, baseServing, targetServing, unitType) {
    
    // Girdi Kontrolleri
    if (typeof baseAmount !== 'number' || typeof baseServing !== 'number' || typeof targetServing !== 'number') {
        throw new Error("Hatalı veri tipi: Sayısal değer giriniz.");
    }
    if (baseAmount < 0 || baseServing <= 0 || targetServing <= 0) {
        throw new Error("Hatalı giriş: Değerler pozitif olmalıdır.");
    }

    const multiplier = targetServing / baseServing;
    const rawAmount = baseAmount * multiplier;

    // Özel Mantık: Adet (qty) hesabı
    if (unitType === 'qty') {
        // 0.5'lik dilimlere yukarı yuvarlama mantığı
        // Örn: 1.2 -> 2.4 -> ceil(2.4)=3 -> 3/2 = 1.5
        let rounded = Math.ceil(rawAmount * 2) / 2;
        
        // Hiçbir zaman 0 olmasın, en az 0.5 olsun
        if (rounded === 0) rounded = 0.5;
        
        return rounded;
    } else {
        // Diğer birimler (gr, ml vb.) için 1 ondalık basamak
        return parseFloat(rawAmount.toFixed(1));
    }
}

module.exports = { calculateRequiredAmount };