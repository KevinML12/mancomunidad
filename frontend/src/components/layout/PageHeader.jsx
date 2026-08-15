export default function PageHeader({ icon: IconEl, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-7 animate-fade-in">
      <div>
        <h1 className="text-24 font-black tracking-tightish text-bg">{title}</h1>
        {subtitle && <p className="text-14 text-bg/50 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
