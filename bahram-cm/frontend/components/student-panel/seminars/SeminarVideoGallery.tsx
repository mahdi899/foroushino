import { ExternalLink, FileDown, Play } from 'lucide-react';

export type SeminarVideoAsset = {
  id: number;
  title: string;
  type: string;
  download_url: string;
  is_external?: boolean;
};

const PLACEHOLDER_COUNT = 4;

function isVideoAsset(asset: SeminarVideoAsset): boolean {
  const type = asset.type?.toLowerCase() ?? '';
  return type === 'video' || type.includes('video') || type === 'recording';
}

export function SeminarVideoGallery({
  assets,
  seminarTitle,
}: {
  assets: SeminarVideoAsset[];
  seminarTitle: string;
}) {
  const videos = assets.filter(isVideoAsset);
  const otherAssets = assets.filter((asset) => !isVideoAsset(asset));
  const showPlaceholders = videos.length === 0;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-text">ویدیوهای سمینار</h2>
          <p className="panel-text-meta mt-1 text-text-muted">
            {showPlaceholders
              ? 'به‌زودی ضبط جلسات اینجا قرار می‌گیرد'
              : `${videos.length.toLocaleString('fa-IR')} ویدیو`}
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {showPlaceholders
          ? Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
              <article
                key={`placeholder-${index}`}
                className="card overflow-hidden"
                aria-label={`جایگاه ویدیو ${index + 1}`}
              >
                <div className="relative aspect-video bg-surface-soft">
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-primary shadow-soft">
                      <Play size={20} className="ms-0.5" />
                    </span>
                    <span className="panel-text-caption font-semibold">ویدیو به‌زودی</span>
                  </div>
                </div>
                <div className="p-3.5">
                  <p className="text-sm font-semibold text-text">
                    بخش {['اول', 'دوم', 'سوم', 'چهارم'][index] ?? `${index + 1}`}
                  </p>
                  <p className="panel-text-caption mt-1 text-text-muted">{seminarTitle}</p>
                </div>
              </article>
            ))
          : videos.map((video, index) => (
              <article key={video.id} className="card group overflow-hidden">
                <a
                  href={video.download_url}
                  className="block"
                  {...(video.is_external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  <div className="relative aspect-video overflow-hidden bg-surface-soft">
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/5"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-glow transition-transform duration-300 group-hover:scale-105">
                        <Play size={20} className="ms-0.5 fill-current" />
                      </span>
                    </div>
                    <span className="absolute bottom-2 start-2 rounded-md bg-black/55 px-2 py-0.5 text-[0.7rem] font-semibold text-white">
                      ویدیو {(index + 1).toLocaleString('fa-IR')}
                    </span>
                  </div>
                  <div className="p-3.5">
                    <p className="text-sm font-semibold text-text">{video.title}</p>
                    <p className="panel-text-caption mt-1 inline-flex items-center gap-1 text-primary">
                      {video.is_external ? <ExternalLink size={13} /> : <Play size={13} />}
                      پخش
                    </p>
                  </div>
                </a>
              </article>
            ))}
      </div>

      {otherAssets.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="border-b border-border/60 p-4">
            <h3 className="panel-card-title">فایل‌های ضمیمه</h3>
          </div>
          <ul className="divide-y divide-border">
            {otherAssets.map((asset) => (
              <li key={asset.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-text">{asset.title}</span>
                <a
                  href={asset.download_url}
                  className="btn btn-secondary panel-text-meta"
                  {...(asset.is_external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {asset.is_external ? <ExternalLink size={16} /> : <FileDown size={16} />}
                  {asset.is_external ? 'مشاهده' : 'دریافت'}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
