// Migration: done

"use strict";
const quoteManager = require("../../quotes/quotes-manager");
const logger = require("../../logwrapper");

const { OutputDataType, VariableCategory } = require("../../../shared/variable-constants");

const model = {
    definition: {
        handle: "rawQuoteAsObject",
        description: "Get a random quote in the form of a raw Object.",
        examples: [
            {
                usage: "rawQuoteAsObject[#]",
                description: "Get a specific quote id."
            },
            {
                usage: "rawQuoteAsObject[#, property]",
                description: "Get only a specific property for a specific quote. Valid properties are id, createdAt, creator, originator, text and game."
            },
            {
                usage: "rawQuoteAsObject[null, property]",
                description: "Get only a specific property for a random quote. Valid properties are id, createdAt, creator, originator, text and game."
            }
        ],
        categories: [VariableCategory.TEXT],
        possibleDataOutput: [OutputDataType.TEXT]
    },
    evaluator: async (_, quoteId, property) => {
        let quote;
        quoteId = parseInt(quoteId);

        if (quoteId != null && !isNaN(quoteId)) {
            logger.debug("Getting quote " + quoteId + "...");
            quote = await quoteManager.getQuote(quoteId);
        } else {
            logger.debug("Getting random quote...");
            quote = await quoteManager.getRandomQuote();
        }

        if (quote != null) {
            logger.debug("Found a quote!");
            const ts = new Date(quote.createdAt);
            const quoteObject = {
                id: quote._id,
                createdAt: ts.toLocaleString(),
                creator: quote.creator,
                originator: quote.originator,
                text: quote.text,
                game: quote.game
            };
            if (property != null) {
                if (property !== "id"
                    && property !== "createdAt"
                    && property !== "creator"
                    && property !== "originator"
                    && property !== "text"
                    && property !== "game") {
                    logger.debug("Failed property check for quote: ", property);
                    return "[Invalid Quote Property]";
                }
                return quoteObject[property];
            }

            return quoteObject;
        }

        logger.debug("Couldnt find a quote.");
        return '[Cant find quote]';
    }
};

module.exports = model;
