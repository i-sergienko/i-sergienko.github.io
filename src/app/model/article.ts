import {ArticlePreview} from './article-preview';

export interface Article {
  metadata: ArticlePreview;
  content: string;
}
