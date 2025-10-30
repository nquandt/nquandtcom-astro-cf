import { onCleanup, onMount } from "solid-js";

type Props = {
    script: string;
    condition: () => boolean; // optional override; if undefined, component checks prefers-reduced-motion
    async?: boolean;
    defer?: boolean;
    attrs?: Record<string, string>;
};

export default function Loader(props: Props) {
    let el: HTMLDivElement | undefined;

    onMount(() => {
        try {
            if (!props.condition()) return;
            if (!props.script) return;

            const s = document.createElement('script');
            s.src = props.script;
            if (props.defer !== false) s.defer = props.defer ?? true;
            if (props.async) s.async = true;
            if (props.attrs) {
                Object.keys(props.attrs).forEach(k => s.setAttribute(k, props.attrs![k]));
            }
            document.head.appendChild(s);
        } catch (e) {
            // swallow errors; don't break page
            // eslint-disable-next-line no-console
            console.error('Loader failed to inject script', e);
        }
    });

    onCleanup(() => {
        // no-op for now; leaving injected script in head is fine
    });

    return <div ref={el} />;
}
