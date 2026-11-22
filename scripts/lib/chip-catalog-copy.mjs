export function chipCatalogCopy({count}) {
  return {
    ja: {title: `ゾンビラッシュ チップ図鑑｜${count}種の効果・検索・フィルタ`, description: `ゾンビラッシュの全${count}チップを画像・名称・Rank・効果から検索。編成メーカーで選んで保存・共有できます。`, summary: `全${count}種`, supplement: ''},
    en: {title: `Zombie Rush Chip Database | ${count} effects and filters`, description: `Browse all ${count} Zombie Rush chips by image, name, rank and effect. Select chips in Team Builder to save and share your lineup.`, summary: `${count} chips`, supplement: ''},
    'zh-CN': {title: `Zombie Rush 芯片图鉴｜${count}种效果与筛选`, description: `按图片、名称、Rank及效果搜索全部${count}种Zombie Rush芯片。在编队工具中选择芯片，保存并分享阵容。`, summary: `共${count}种芯片`, supplement: ''}
  };
}
