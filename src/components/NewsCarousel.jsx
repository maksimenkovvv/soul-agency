import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { blogApi } from '../api/blogApi';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

function formatDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

export default function NewsCarousel({ title = 'Новости', size = 10 }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const railRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    blogApi
      .list({ page: 0, size, q: '', sort: 'createdWhen,desc' })
      .then((res) => {
        if (!mounted) return;
        setItems(Array.isArray(res?.content) ? res.content : []);
      })
      .catch(() => mounted && setItems([]))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [size]);

  const scrollByCards = (dir = 1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector('.news-card');
    const w = card ? card.getBoundingClientRect().width : 360;
    el.scrollBy({ left: dir * (w + 16) * 2, behavior: 'smooth' });
  };

  const startAutoplay = () => {
    stopAutoplay();
    timerRef.current = setInterval(() => {
      const el = railRef.current;
      if (!el) return;
      // если дошли до конца — вернёмся
      const nearEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 24;
      if (nearEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
      else scrollByCards(1);
    }, 4500);
  };

  const stopAutoplay = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => {
    // автоплей только если есть контент
    if (!loading && items.length > 3) startAutoplay();
    return () => stopAutoplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, items.length]);

  // Обновляем GSAP, когда новости загрузились и скелетон исчез
  useEffect(() => {
    if (!loading) {
      // Небольшая задержка, чтобы React успел перерисовать DOM (скелетон -> карточки)
      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [loading]);

  return (
    <section
      className="news-carousel"
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
      onFocus={stopAutoplay}
      onBlur={startAutoplay}
    >
      <div className="news-carousel__head">
        <div>
          <div className="news-carousel__title">{title}</div>
          <div className="news-carousel__subtitle">Свежие статьи и обновления</div>
        </div>

        <div className="news-carousel__actions">
          <button
            type="button"
            className="news-carousel__nav"
            onClick={() => scrollByCards(-1)}
            aria-label="Назад"
          >
            ‹
          </button>
          <button
            type="button"
            className="news-carousel__nav"
            onClick={() => scrollByCards(1)}
            aria-label="Вперёд"
          >
            ›
          </button>
          <Link
            to="/blog"
            className="b-btn b-btn--transparent news-carousel__all"
          >
            Все статьи
          </Link>
        </div>
      </div>

      <div
        ref={railRef}
        className="news-carousel__rail"
        tabIndex={0}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="news-card news-card--skeleton"
            />
          ))
        ) : items.length ? (
          items.map((p) => (
            <Link
              key={p.slug || p.id}
              to={`/blog/${p.id}-${p.slug}`}
              className="news-card"
            >
              <div className="news-card__media">
                {p.previewImageUrl ? (
                  <img
                    src={p.previewImageUrl}
                    alt={p.title || 'Обложка'}
                  />
                ) : null}
              </div>

              <div className="news-card__body">
                <div className="news-card__meta">
                  <span>{p.publishedAt ? formatDate(p.publishedAt) : ''}</span>
                  {p.readingTimeMinutes ? <span>• {p.readingTimeMinutes} мин</span> : null}
                </div>
                <div className="news-card__title">{p.title}</div>
                {p.description ? <div className="news-card__desc">{p.description}</div> : null}
              </div>
            </Link>
          ))
        ) : (
          <div className="news-carousel__empty">Пока нет новостей.</div>
        )}
      </div>
    </section>
  );
}
