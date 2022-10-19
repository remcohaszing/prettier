import { getMaxContinuousCount } from "../common/util.js";
import { hardline, markAsRoot } from "../document/builders.js";
import { replaceEndOfLine } from "../document/utils.js";
import printFrontMatter from "../utils/front-matter/print.js";
import inferParserByLanguage from "../utils/infer-parser-by-language.js";
import { getFencedCodeBlockValue } from "./utils.js";

function embed(path, options) {
  const { node } = path;

  if (node.type === "code" && node.lang !== null) {
    const parser = inferParserByLanguage(node.lang, options);
    if (parser) {
      return async (textToDoc) => {
        const styleUnit = options.__inJsTemplate ? "~" : "`";
        const style = styleUnit.repeat(
          Math.max(3, getMaxContinuousCount(node.value, styleUnit) + 1)
        );
        const newOptions = { parser };
        if (node.lang === "tsx") {
          newOptions.filepath = "dummy.tsx";
        }

        const doc = await textToDoc(
          getFencedCodeBlockValue(node, options.originalText),
          newOptions
        );

        return markAsRoot([
          style,
          node.lang,
          node.meta ? " " + node.meta : "",
          hardline,
          replaceEndOfLine(doc),
          hardline,
          style,
        ]);
      };
    }
  }

  switch (node.type) {
    case "yaml":
      return (textToDoc) => printFrontMatter(node, textToDoc);

    // MDX
    case "importExport":
      return async (textToDoc) => [
        await textToDoc(node.value, { parser: "babel" }),
        hardline,
      ];
    case "jsx":
      return (textToDoc) =>
        textToDoc(`<$>${node.value}</$>`, {
          parser: "__js_expression",
          rootMarker: "mdx",
        });
  }

  return null;
}

export default embed;
