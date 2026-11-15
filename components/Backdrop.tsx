import { Orb, type OrbProps } from "./Orb";

export function Backdrop(props: Omit<OrbProps, "animate">) {
  return <Orb {...props} animate />;
}
