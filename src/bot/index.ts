import { createFlow } from "@builderbot/bot";
import { mainFlow } from "./mainFlow";
import { registerFlow } from "./registerFlow";
// detector de intenciones
import { intentionGeneralFlow } from "./intentionGeneralFlow";
// flujos de intenciones
import { faqFlow } from "./faqFlow";
import { faqMenuFlow } from "./faqMenuFlow";
import { greetingFlow } from "./greetingFlow";
import { mainMenuFlow } from "./mainMenuFlow";
// flujos de areas
import { selectServiceModeFlow } from "./selectServiceModeFlow";
import { genericAgentFlow } from "./liveAgents/genericAgentFlow";
import { intermediaryFlow } from "./intermediaryFlow";
import { askUserDataFlow } from "./askUserDataFlow";
import { genericAreaFlow } from "./areas/genericAreaFlow";
import { postAreaFlow } from "./postAreaFlow";
// flujos de faq
import { postFAQFlow } from "./postFAQFlow";
import { postFAQAreaFlow } from "./postFAQAreaFlow";

export default createFlow([
    mainFlow,
    registerFlow,
    intentionGeneralFlow,
    faqFlow,
    faqMenuFlow,
    greetingFlow,
    mainMenuFlow,
    selectServiceModeFlow,
    genericAgentFlow,
    intermediaryFlow,
    askUserDataFlow,
    genericAreaFlow,
    postAreaFlow,
    postFAQFlow,
    postFAQAreaFlow,
]);


