import { DayInLifeItem, SectionsMap } from "@/lib/dayInLife/types";


type Props = {
    item: DayInLifeItem;
    isEditing: boolean;
    setSections: React.Dispatch<React.SetStateAction<SectionsMap>>;
};

export default function ItemRow({
    item,
    isEditing,
    setSections,
}: Props) {
    return (
        <div className="flex items-center gap-2 py-1">
            {isEditing ? (
                <input
                    value={item.text}
                    onChange={(e) => {
                        const val = e.target.value;

                        setSections((prev: SectionsMap) => {
                            const copy = structuredClone(prev);
                            const list = copy[item.section];
                            const target = list.find(
                                (i: DayInLifeItem) => i.id === item.id
                            );
                            if (target) target.text = val;
                            return copy;
                        });
                    }}
                    className="w-full border rounded px-2 py-1"
                />
            ) : (
                <span>{item.text}</span>
            )}
        </div>
    );
}
