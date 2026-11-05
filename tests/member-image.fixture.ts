// Development-only fixture. Calls the real image pipeline, never Auth/Storage.
import { prepareMemberImage } from "../src/lib/member-image";
Object.assign(window, { prepareTestImage: prepareMemberImage });
