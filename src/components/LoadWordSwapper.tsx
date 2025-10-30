import { isMotionOkay } from "@/utils/motion";
import Loader from "./Loader";

export default function LoadWordSwapper() {
    return <Loader script="/swap-words.js" condition={isMotionOkay} />;
}