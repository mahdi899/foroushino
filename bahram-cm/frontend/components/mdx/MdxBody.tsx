import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { mdxComponents } from "./mdx-components";

/**
 * Server-rendered MDX body. Named `MdxBody` (not `MDXContent`) to avoid a naming
 * collision with the internal component the MDX compiler emits in development,
 * which otherwise causes React 500 errors on detail pages.
 */
export function MdxBody({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      components={mdxComponents}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            rehypeSlug,
            [
              rehypeAutolinkHeadings,
              { behavior: "wrap", properties: { className: "heading-anchor" } },
            ],
          ],
        },
      }}
    />
  );
}
