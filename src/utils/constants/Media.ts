export const icons = {
  addIcon: '/icons/add_icon.svg',
  addIcon02: '/icons/add_icon_02.svg',
  backIcon: '/icons/back_icon.svg',
  checkIcon: '/icons/check_icon.svg',
  closeIcon: '/icons/close_icon.svg',
  collectionIcon: '/icons/collection_icon.svg',
  copy: '/icons/copy.svg',
  dislikeIcon: '/icons/dislike_icon.svg',
  dislikeOnCard: '/icons/dislike_on_card.svg',
  editIcon: '/icons/edit_icon.svg',
  errorIcon: '/icons/error_icon.svg',
  favoriteIcon: '/icons/favorite_icon.svg',
  filterIcon: '/icons/filter_icon.svg',
  googleIcon: '/icons/google_icon.svg',
  grid: '/icons/grid.svg',
  hideIcon: '/icons/hide_icon.svg',
  infoIcon: '/icons/info_icon.svg',
  likeIcon: '/icons/like_icon.svg',
  likeOnCard: '/icons/like_on_card.svg',
  list: '/icons/list.svg',
  logo: '/icons/logo.svg',
  menuIcon: '/icons/menu_icon.svg',
  openTabIcon: '/icons/open_tab_icon.svg',
  removeIcon: '/icons/remove_icon.svg',
  scrollDownOpenIcon: '/icons/scroll_down_open_icon.svg',
  searchIcon: '/icons/search_icon.svg',
  showIcon: '/icons/show_icon.svg',
  twitterIcon: '/icons/twitter_icon.svg',
  watchIcon: '/icons/watch_icon.svg',
};

export const images = {};

export type imagesKey = keyof typeof images;

class Media {
  static icons = icons;
  static images = images;
}

export default Media;
