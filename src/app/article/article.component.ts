import {Component, OnInit} from '@angular/core';
import {ArticleService} from '../article.service';
import {ActivatedRoute} from '@angular/router';
import {ArticlePreview} from '../model/article-preview';
import {Article} from '../model/article';

@Component({
  selector: 'app-article',
  templateUrl: './article.component.html',
  styleUrls: ['./article.component.css']
})
export class ArticleComponent implements OnInit {
  article: Article;

  constructor(
    private route: ActivatedRoute,
    public articleService: ArticleService
  ) {
  }

  ngOnInit(): void {
    const articleName = this.route.snapshot.paramMap.get('name');

    this.articleService.getArticleByName(articleName)
      .subscribe(article => this.article = article);
  }

}
