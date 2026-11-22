import { useState } from "react";
import { ArrowRight, FileImage, Laptop, Link2, Smartphone, StickyNote } from "lucide-react";

const examples = [
  { label: "File", name: "coastline.jpg", detail: "Photo · 8.4 MB", Icon: FileImage },
  { label: "Link", name: "Saved address", detail: "Link", Icon: Link2 },
  { label: "Note", name: "Weekend plans", detail: "Text note", Icon: StickyNote },
];

export function DispatchArt() {
  const [selected, setSelected] = useState(0);
  const { name, detail, Icon } = examples[selected];

  return (
    <figure className="transfer-preview">
      <div className="preview-stage" aria-hidden="true">
        <div className="preview-route">
          <span><Laptop size={23} /> This device</span>
          <ArrowRight size={17} />
          <span><Smartphone size={20} /> Other device</span>
        </div>
        <div className="preview-item" key={selected}>
          <div className="preview-icon"><Icon size={40} strokeWidth={1.35} /></div>
          <div><strong>{name}</strong><small>{detail}</small></div>
        </div>
      </div>
      <figcaption>
        <div className="preview-options" role="group" aria-label="Transfer examples">
          {examples.map(({ label }, index) => (
            <button key={label} type="button" aria-pressed={selected === index}
              onClick={() => setSelected(index)}>{label}</button>
          ))}
        </div>
        <span role="status" className="preview-caption">Example · {name}</span>
      </figcaption>
    </figure>
  );
}
