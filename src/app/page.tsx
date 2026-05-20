import DataPreview from "./DataPreview";

export default function Home() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-2">Phase 1 完成检验</h2>
        <p className="text-gray-600 text-sm mb-6">
          以下内容从 <code className="bg-gray-100 px-1 rounded">/api/knowledge</code> 和{" "}
          <code className="bg-gray-100 px-1 rounded">/api/problems</code> 实时 fetch，
          验证两个 JSON 已正确落地。
        </p>
        <DataPreview />
      </section>

      <section className="bg-blue-50 border border-blue-200 rounded-lg p-5 text-sm text-blue-800 space-y-2">
        <p>
          <strong>Phase 4 已开放：</strong>诊断与答题记录自动保存到浏览器 IndexedDB，刷新不丢失。
          前往{" "}
          <a href="/history" className="underline font-medium">历史页</a>{" "}
          可回看历次诊断报告与答题结果。
        </p>
        <p className="text-blue-700">
          还没诊断过？前往{" "}
          <a href="/diagnose" className="underline font-medium">错题诊断</a>{" "}
          开始 → 上传错题 → 三句话诊断 → 逐题作答。
        </p>
      </section>
    </div>
  );
}
