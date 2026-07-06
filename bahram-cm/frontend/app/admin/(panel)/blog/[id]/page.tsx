import { ArticleEditor } from '../ArticleEditor';

export const dynamic = 'force-dynamic';

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  return <ArticleEditor articleId={Number.isFinite(id) ? id : null} />;
}
