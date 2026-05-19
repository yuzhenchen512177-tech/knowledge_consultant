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
          <strong>Phase 2 已开放：</strong>前往{" "}
          <a href="/diagnose" className="underline font-medium">错题诊断页</a>{" "}
          上传错题（PDF / 图片 / txt / 文本）→ 三句话诊断 + 推荐 5 道练习。
        </p>
        <p className="text-blue-700">
          想替换样本数据？去{" "}
          <a href="/admin" className="underline font-medium">管理员页面</a>{" "}
          重新解析 Phase 0 PDF。
        </p>
      </section>
    </div>
  );
}
