function chooseLayout(count){
  if(count <= 0) return 'empty';
  if(count <= 3) return 'card';
  if(count <= 7) return 'list';
  if(count <= 12) return 'compact';
  return 'dense';
}
function layoutAdvice(count){
  if(count <= 0) return 'まずは予定を追加してください。';
  if(count <= 3) return '予定が少ないので、余白を広く使うカード型が見やすいです。';
  if(count <= 7) return '一週間分に近いので、リスト型で見やすく整理しました。';
  if(count <= 12) return '予定が多めなので、コンパクトなタイムテーブル型にしました。';
  return '予定が多いので、文字を小さめにして一覧性を優先しました。';
}
