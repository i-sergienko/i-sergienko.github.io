import {Component, OnInit} from '@angular/core';
import {ArticlePreview} from '../model/article-preview';
import {ArticleService} from '../article.service';

@Component({
  selector: 'app-article-list',
  templateUrl: './article-list.component.html',
  styleUrls: ['./article-list.component.css']
})
export class ArticleListComponent implements OnInit {
  articlePreviews: ArticlePreview[];

  constructor(private articleService: ArticleService) {
  }

  ngOnInit(): void {
    this.articleService.getArticleMetadata()
      .subscribe(previews => this.articlePreviews = previews);
  }
}
