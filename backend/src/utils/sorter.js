function sortRecipes(recipes, sortBy) {
    // Orijinal diziyi bozmamak için kopyasını alıyoruz (Immutability)
    let sorted = [...recipes];

    switch (sortBy) {
      case 'rating_high': 
        sorted.sort((a, b) => parseFloat(b.average_rating || 0) - parseFloat(a.average_rating || 0));
        break;
      case 'rating_low': 
        sorted.sort((a, b) => parseFloat(a.average_rating || 0) - parseFloat(b.average_rating || 0));
        break;
      case 'match_high':
        sorted.sort((a, b) => (b.match_percentage || 0) - (a.match_percentage || 0));
        break;
      case 'match_low':
        sorted.sort((a, b) => (a.match_percentage || 0) - (b.match_percentage || 0));
        break;
      case 'calories_low': 
        sorted.sort((a, b) => (a.calories || 0) - (b.calories || 0));
        break;
      case 'calories_high':
        sorted.sort((a, b) => (b.calories || 0) - (a.calories || 0));
        break;
      case 'time_short': 
        sorted.sort((a, b) => (a.prep_time || 0) - (b.prep_time || 0));
        break;
      case 'time_long':
        sorted.sort((a, b) => (b.prep_time || 0) - (a.prep_time || 0));
        break;
      case 'date_old': 
        sorted.sort((a, b) => new Date(a.added_at) - new Date(b.added_at));
        break;
      case 'date_new': 
      default:
        // Varsayılan olarak en yeni tarihli en üstte
        sorted.sort((a, b) => new Date(b.added_at) - new Date(a.added_at));
        break;
    }

    return sorted;
}

module.exports = { sortRecipes };