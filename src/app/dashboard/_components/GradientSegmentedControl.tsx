import { SegmentedControl, type SegmentedControlProps } from "@mantine/core";

type GradientSegmentedControlProps = Pick<
	SegmentedControlProps,
	"classNames" | "radius" | "size" | "data" | "value" | "onChange"
>;

export function GradientSegmentedControl({
	classNames,
	radius,
	size,
	data,
	value,
	onChange,
}: GradientSegmentedControlProps) {
	return (
		<SegmentedControl
			classNames={classNames}
			data={data}
			onChange={onChange}
			radius={radius}
			size={size}
			value={value}
		/>
	);
}
