# Get test

GET https://api.elevenlabs.io/v1/convai/agent-testing/{test_id}

Gets an agent response test by ID.

Reference: https://elevenlabs.io/docs/api-reference/tests/get

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Get Agent Response Test By Id
  version: endpoint_conversationalAi/tests.get
paths:
  /v1/convai/agent-testing/{test_id}:
    get:
      operationId: get
      summary: Get Agent Response Test By Id
      description: Gets an agent response test by ID.
      tags:
        - - subpackage_conversationalAi
          - subpackage_conversationalAi/tests
      parameters:
        - name: test_id
          in: path
          description: The id of a chat response test. This is returned on test creation.
          required: true
          schema:
            type: string
        - name: xi-api-key
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GetUnitTestResponseModel'
        '422':
          description: Validation Error
          content: {}
components:
  schemas:
    ConversationHistoryTranscriptCommonModelOutputRole:
      type: string
      enum:
        - value: user
        - value: agent
    AgentMetadata:
      type: object
      properties:
        agent_id:
          type: string
        branch_id:
          type:
            - string
            - 'null'
        workflow_node_id:
          type:
            - string
            - 'null'
      required:
        - agent_id
    ConversationHistoryMultivoiceMessagePartModel:
      type: object
      properties:
        text:
          type: string
        voice_label:
          type:
            - string
            - 'null'
        time_in_call_secs:
          type:
            - integer
            - 'null'
      required:
        - text
        - voice_label
        - time_in_call_secs
    ConversationHistoryMultivoiceMessageModel:
      type: object
      properties:
        parts:
          type: array
          items:
            $ref: '#/components/schemas/ConversationHistoryMultivoiceMessagePartModel'
      required:
        - parts
    ToolType:
      type: string
      enum:
        - value: system
        - value: webhook
        - value: client
        - value: mcp
        - value: workflow
        - value: api_integration_webhook
        - value: api_integration_mcp
    ConversationHistoryTranscriptToolCallWebhookDetails:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: webhook
        method:
          type: string
        url:
          type: string
        headers:
          type: object
          additionalProperties:
            type: string
        path_params:
          type: object
          additionalProperties:
            type: string
        query_params:
          type: object
          additionalProperties:
            type: string
        body:
          type:
            - string
            - 'null'
      required:
        - method
        - url
    ConversationHistoryTranscriptToolCallClientDetails:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: client
        parameters:
          type: string
      required:
        - parameters
    ConversationHistoryTranscriptToolCallMCPDetails:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: mcp
        mcp_server_id:
          type: string
        mcp_server_name:
          type: string
        integration_type:
          type: string
        parameters:
          type: object
          additionalProperties:
            type: string
        approval_policy:
          type: string
        requires_approval:
          type: boolean
          default: false
        mcp_tool_name:
          type: string
          default: ''
        mcp_tool_description:
          type: string
          default: ''
      required:
        - mcp_server_id
        - mcp_server_name
        - integration_type
        - approval_policy
    ConversationHistoryTranscriptToolCallApiIntegrationWebhookDetails:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: api_integration_webhook
        integration_id:
          type: string
        credential_id:
          type: string
        integration_connection_id:
          type: string
        webhook_details:
          $ref: >-
            #/components/schemas/ConversationHistoryTranscriptToolCallWebhookDetails
      required:
        - integration_id
        - credential_id
        - integration_connection_id
        - webhook_details
    ConversationHistoryTranscriptToolCallCommonModelOutputToolDetails:
      oneOf:
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptToolCallWebhookDetails
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptToolCallClientDetails
        - $ref: '#/components/schemas/ConversationHistoryTranscriptToolCallMCPDetails'
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptToolCallApiIntegrationWebhookDetails
    ConversationHistoryTranscriptToolCallCommonModel-Output:
      type: object
      properties:
        type:
          oneOf:
            - $ref: '#/components/schemas/ToolType'
            - type: 'null'
        request_id:
          type: string
        tool_name:
          type: string
        params_as_json:
          type: string
        tool_has_been_called:
          type: boolean
        tool_details:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationHistoryTranscriptToolCallCommonModelOutputToolDetails
            - type: 'null'
      required:
        - request_id
        - tool_name
        - params_as_json
        - tool_has_been_called
    DynamicVariableUpdateCommonModel:
      type: object
      properties:
        variable_name:
          type: string
        old_value:
          type:
            - string
            - 'null'
        new_value:
          type: string
        updated_at:
          type: number
          format: double
        tool_name:
          type: string
        tool_request_id:
          type: string
      required:
        - variable_name
        - old_value
        - new_value
        - updated_at
        - tool_name
        - tool_request_id
    ConversationHistoryTranscriptOtherToolsResultCommonModelType:
      type: string
      enum:
        - value: client
        - value: webhook
        - value: mcp
    ConversationHistoryTranscriptOtherToolsResultCommonModel:
      type: object
      properties:
        request_id:
          type: string
        tool_name:
          type: string
        result_value:
          type: string
        is_error:
          type: boolean
        tool_has_been_called:
          type: boolean
        tool_latency_secs:
          type: number
          format: double
          default: 0
        dynamic_variable_updates:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableUpdateCommonModel'
        type:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationHistoryTranscriptOtherToolsResultCommonModelType
            - type: 'null'
      required:
        - request_id
        - tool_name
        - result_value
        - is_error
        - tool_has_been_called
    EndCallToolResultModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: end_call_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        reason:
          type:
            - string
            - 'null'
        message:
          type:
            - string
            - 'null'
    LanguageDetectionToolResultModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: language_detection_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        reason:
          type:
            - string
            - 'null'
        language:
          type:
            - string
            - 'null'
    TransferToAgentToolResultSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_agent_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        from_agent:
          type: string
        to_agent:
          type: string
        condition:
          type: string
        delay_ms:
          type: integer
          default: 0
        transfer_message:
          type:
            - string
            - 'null'
        enable_transferred_agent_first_message:
          type: boolean
          default: false
      required:
        - from_agent
        - to_agent
        - condition
    TransferToAgentToolResultErrorModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_agent_error
        status:
          type: string
          enum:
            - type: stringLiteral
              value: error
        from_agent:
          type: string
        error:
          type: string
      required:
        - from_agent
        - error
    TransferToNumberResultTwilioSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_number_twilio_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        transfer_number:
          type: string
        reason:
          type:
            - string
            - 'null'
        client_message:
          type:
            - string
            - 'null'
        agent_message:
          type: string
        conference_name:
          type: string
        note:
          type:
            - string
            - 'null'
      required:
        - transfer_number
        - agent_message
        - conference_name
    TransferToNumberResultSipSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_number_sip_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        transfer_number:
          type: string
        reason:
          type:
            - string
            - 'null'
        note:
          type:
            - string
            - 'null'
      required:
        - transfer_number
    TransferToNumberResultErrorModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: transfer_to_number_error
        status:
          type: string
          enum:
            - type: stringLiteral
              value: error
        error:
          type: string
        details:
          type:
            - string
            - 'null'
      required:
        - error
    SkipTurnToolResponseModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: skip_turn_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        reason:
          type:
            - string
            - 'null'
    PlayDTMFResultSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: play_dtmf_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        dtmf_tones:
          type: string
        reason:
          type:
            - string
            - 'null'
      required:
        - dtmf_tones
    PlayDTMFResultErrorModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: play_dtmf_error
        status:
          type: string
          enum:
            - type: stringLiteral
              value: error
        error:
          type: string
        details:
          type:
            - string
            - 'null'
      required:
        - error
    VoiceMailDetectionResultSuccessModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: voicemail_detection_success
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        voicemail_message:
          type:
            - string
            - 'null'
        reason:
          type:
            - string
            - 'null'
    TestToolResultModel:
      type: object
      properties:
        result_type:
          type: string
          enum:
            - type: stringLiteral
              value: testing_tool_result
        status:
          type: string
          enum:
            - type: stringLiteral
              value: success
        reason:
          type: string
          default: Skipping tool call in test mode
    ConversationHistoryTranscriptSystemToolResultCommonModelResult:
      oneOf:
        - $ref: '#/components/schemas/EndCallToolResultModel'
        - $ref: '#/components/schemas/LanguageDetectionToolResultModel'
        - $ref: '#/components/schemas/TransferToAgentToolResultSuccessModel'
        - $ref: '#/components/schemas/TransferToAgentToolResultErrorModel'
        - $ref: '#/components/schemas/TransferToNumberResultTwilioSuccessModel'
        - $ref: '#/components/schemas/TransferToNumberResultSipSuccessModel'
        - $ref: '#/components/schemas/TransferToNumberResultErrorModel'
        - $ref: '#/components/schemas/SkipTurnToolResponseModel'
        - $ref: '#/components/schemas/PlayDTMFResultSuccessModel'
        - $ref: '#/components/schemas/PlayDTMFResultErrorModel'
        - $ref: '#/components/schemas/VoiceMailDetectionResultSuccessModel'
        - $ref: '#/components/schemas/TestToolResultModel'
    ConversationHistoryTranscriptSystemToolResultCommonModel:
      type: object
      properties:
        request_id:
          type: string
        tool_name:
          type: string
        result_value:
          type: string
        is_error:
          type: boolean
        tool_has_been_called:
          type: boolean
        tool_latency_secs:
          type: number
          format: double
          default: 0
        dynamic_variable_updates:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableUpdateCommonModel'
        type:
          type: string
          enum:
            - type: stringLiteral
              value: system
        result:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationHistoryTranscriptSystemToolResultCommonModelResult
            - type: 'null'
      required:
        - request_id
        - tool_name
        - result_value
        - is_error
        - tool_has_been_called
        - type
    ConversationHistoryTranscriptApiIntegrationWebhookToolsResultCommonModel:
      type: object
      properties:
        request_id:
          type: string
        tool_name:
          type: string
        result_value:
          type: string
        is_error:
          type: boolean
        tool_has_been_called:
          type: boolean
        tool_latency_secs:
          type: number
          format: double
          default: 0
        dynamic_variable_updates:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableUpdateCommonModel'
        type:
          type: string
          enum:
            - type: stringLiteral
              value: api_integration_webhook
        integration_id:
          type: string
        credential_id:
          type: string
        integration_connection_id:
          type: string
      required:
        - request_id
        - tool_name
        - result_value
        - is_error
        - tool_has_been_called
        - type
        - integration_id
        - credential_id
        - integration_connection_id
    WorkflowToolEdgeStepModel:
      type: object
      properties:
        step_latency_secs:
          type: number
          format: double
        type:
          type: string
          enum:
            - type: stringLiteral
              value: edge
        edge_id:
          type: string
        target_node_id:
          type: string
      required:
        - step_latency_secs
        - edge_id
        - target_node_id
    WorkflowToolNestedToolsStepModelOutputResultsItems:
      oneOf:
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptOtherToolsResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptSystemToolResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptApiIntegrationWebhookToolsResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptWorkflowToolsResultCommonModel-Output
    WorkflowToolNestedToolsStepModel-Output:
      type: object
      properties:
        step_latency_secs:
          type: number
          format: double
        type:
          type: string
          enum:
            - type: stringLiteral
              value: nested_tools
        node_id:
          type: string
        requests:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptToolCallCommonModel-Output
        results:
          type: array
          items:
            $ref: >-
              #/components/schemas/WorkflowToolNestedToolsStepModelOutputResultsItems
        is_successful:
          type: boolean
      required:
        - step_latency_secs
        - node_id
        - requests
        - results
        - is_successful
    WorkflowToolMaxIterationsExceededStepModel:
      type: object
      properties:
        step_latency_secs:
          type: number
          format: double
        type:
          type: string
          enum:
            - type: stringLiteral
              value: max_iterations_exceeded
        max_iterations:
          type: integer
      required:
        - step_latency_secs
        - max_iterations
    WorkflowToolResponseModelOutputStepsItems:
      oneOf:
        - $ref: '#/components/schemas/WorkflowToolEdgeStepModel'
        - $ref: '#/components/schemas/WorkflowToolNestedToolsStepModel-Output'
        - $ref: '#/components/schemas/WorkflowToolMaxIterationsExceededStepModel'
    WorkflowToolResponseModel-Output:
      type: object
      properties:
        steps:
          type: array
          items:
            $ref: '#/components/schemas/WorkflowToolResponseModelOutputStepsItems'
    ConversationHistoryTranscriptWorkflowToolsResultCommonModel-Output:
      type: object
      properties:
        request_id:
          type: string
        tool_name:
          type: string
        result_value:
          type: string
        is_error:
          type: boolean
        tool_has_been_called:
          type: boolean
        tool_latency_secs:
          type: number
          format: double
          default: 0
        dynamic_variable_updates:
          type: array
          items:
            $ref: '#/components/schemas/DynamicVariableUpdateCommonModel'
        type:
          type: string
          enum:
            - type: stringLiteral
              value: workflow
        result:
          oneOf:
            - $ref: '#/components/schemas/WorkflowToolResponseModel-Output'
            - type: 'null'
      required:
        - request_id
        - tool_name
        - result_value
        - is_error
        - tool_has_been_called
        - type
    ConversationHistoryTranscriptCommonModelOutputToolResultsItems:
      oneOf:
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptOtherToolsResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptSystemToolResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptApiIntegrationWebhookToolsResultCommonModel
        - $ref: >-
            #/components/schemas/ConversationHistoryTranscriptWorkflowToolsResultCommonModel-Output
    UserFeedbackScore:
      type: string
      enum:
        - value: like
        - value: dislike
    UserFeedback:
      type: object
      properties:
        score:
          $ref: '#/components/schemas/UserFeedbackScore'
        time_in_call_secs:
          type: integer
      required:
        - score
        - time_in_call_secs
    MetricRecord:
      type: object
      properties:
        elapsed_time:
          type: number
          format: double
      required:
        - elapsed_time
    ConversationTurnMetrics:
      type: object
      properties:
        metrics:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/MetricRecord'
    RagChunkMetadata:
      type: object
      properties:
        document_id:
          type: string
        chunk_id:
          type: string
        vector_distance:
          type: number
          format: double
      required:
        - document_id
        - chunk_id
        - vector_distance
    EmbeddingModelEnum:
      type: string
      enum:
        - value: e5_mistral_7b_instruct
        - value: multilingual_e5_large_instruct
    RagRetrievalInfo:
      type: object
      properties:
        chunks:
          type: array
          items:
            $ref: '#/components/schemas/RagChunkMetadata'
        embedding_model:
          $ref: '#/components/schemas/EmbeddingModelEnum'
        retrieval_query:
          type: string
        rag_latency_secs:
          type: number
          format: double
      required:
        - chunks
        - embedding_model
        - retrieval_query
        - rag_latency_secs
    LLMTokensCategoryUsage:
      type: object
      properties:
        tokens:
          type: integer
          default: 0
        price:
          type: number
          format: double
          default: 0
    LLMInputOutputTokensUsage:
      type: object
      properties:
        input:
          $ref: '#/components/schemas/LLMTokensCategoryUsage'
        input_cache_read:
          $ref: '#/components/schemas/LLMTokensCategoryUsage'
        input_cache_write:
          $ref: '#/components/schemas/LLMTokensCategoryUsage'
        output_total:
          $ref: '#/components/schemas/LLMTokensCategoryUsage'
    LLMUsage-Output:
      type: object
      properties:
        model_usage:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/LLMInputOutputTokensUsage'
    ConversationHistoryTranscriptCommonModelOutputSourceMedium:
      type: string
      enum:
        - value: audio
        - value: text
    ConversationHistoryTranscriptCommonModel-Output:
      type: object
      properties:
        role:
          $ref: >-
            #/components/schemas/ConversationHistoryTranscriptCommonModelOutputRole
        agent_metadata:
          oneOf:
            - $ref: '#/components/schemas/AgentMetadata'
            - type: 'null'
        message:
          type:
            - string
            - 'null'
        multivoice_message:
          oneOf:
            - $ref: '#/components/schemas/ConversationHistoryMultivoiceMessageModel'
            - type: 'null'
        tool_calls:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptToolCallCommonModel-Output
        tool_results:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptCommonModelOutputToolResultsItems
        feedback:
          oneOf:
            - $ref: '#/components/schemas/UserFeedback'
            - type: 'null'
        llm_override:
          type:
            - string
            - 'null'
        time_in_call_secs:
          type: integer
        conversation_turn_metrics:
          oneOf:
            - $ref: '#/components/schemas/ConversationTurnMetrics'
            - type: 'null'
        rag_retrieval_info:
          oneOf:
            - $ref: '#/components/schemas/RagRetrievalInfo'
            - type: 'null'
        llm_usage:
          oneOf:
            - $ref: '#/components/schemas/LLMUsage-Output'
            - type: 'null'
        interrupted:
          type: boolean
          default: false
        original_message:
          type:
            - string
            - 'null'
        source_medium:
          oneOf:
            - $ref: >-
                #/components/schemas/ConversationHistoryTranscriptCommonModelOutputSourceMedium
            - type: 'null'
      required:
        - role
        - time_in_call_secs
    AgentSuccessfulResponseExample:
      type: object
      properties:
        response:
          type: string
        type:
          type: string
          enum:
            - type: stringLiteral
              value: success
      required:
        - response
        - type
    AgentFailureResponseExample:
      type: object
      properties:
        response:
          type: string
        type:
          type: string
          enum:
            - type: stringLiteral
              value: failure
      required:
        - response
        - type
    LLMParameterEvaluationStrategy:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: llm
        description:
          type: string
          description: A description of the evaluation strategy to use for the test.
      required:
        - type
        - description
    RegexParameterEvaluationStrategy:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: regex
        pattern:
          type: string
          description: A regex pattern to match the agent's response against.
      required:
        - type
        - pattern
    ExactParameterEvaluationStrategy:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: exact
        expected_value:
          type: string
          description: The exact string value that the parameter must match.
      required:
        - type
        - expected_value
    MatchAnythingParameterEvaluationStrategy:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: anything
      required:
        - type
    UnitTestToolCallParameterEval:
      oneOf:
        - $ref: '#/components/schemas/LLMParameterEvaluationStrategy'
        - $ref: '#/components/schemas/RegexParameterEvaluationStrategy'
        - $ref: '#/components/schemas/ExactParameterEvaluationStrategy'
        - $ref: '#/components/schemas/MatchAnythingParameterEvaluationStrategy'
    UnitTestToolCallParameter:
      type: object
      properties:
        eval:
          $ref: '#/components/schemas/UnitTestToolCallParameterEval'
        path:
          type: string
      required:
        - eval
        - path
    ReferencedToolCommonModelType:
      type: string
      enum:
        - value: system
        - value: webhook
        - value: client
        - value: workflow
        - value: api_integration_webhook
    ReferencedToolCommonModel:
      type: object
      properties:
        id:
          type: string
          description: The ID of the tool
        type:
          $ref: '#/components/schemas/ReferencedToolCommonModelType'
          description: The type of the tool
      required:
        - id
        - type
    UnitTestToolCallEvaluationModel-Output:
      type: object
      properties:
        parameters:
          type: array
          items:
            $ref: '#/components/schemas/UnitTestToolCallParameter'
          description: >-
            Parameters to evaluate for the agent's tool call. If empty, the tool
            call parameters are not evaluated.
        referenced_tool:
          oneOf:
            - $ref: '#/components/schemas/ReferencedToolCommonModel'
            - type: 'null'
          description: The tool to evaluate a call against.
        verify_absence:
          type: boolean
          default: false
          description: Whether to verify that the tool was NOT called.
    GetUnitTestResponseModelDynamicVariables:
      oneOf:
        - type: string
        - type: number
          format: double
        - type: integer
        - type: boolean
    UnitTestCommonModelType:
      type: string
      enum:
        - value: llm
        - value: tool
    TestFromConversationMetadata-Output:
      type: object
      properties:
        conversation_id:
          type: string
        agent_id:
          type: string
        workflow_node_id:
          type:
            - string
            - 'null'
        original_agent_reply:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptCommonModel-Output
      required:
        - conversation_id
        - agent_id
    GetUnitTestResponseModel:
      type: object
      properties:
        chat_history:
          type: array
          items:
            $ref: >-
              #/components/schemas/ConversationHistoryTranscriptCommonModel-Output
        success_condition:
          type: string
          description: >-
            A prompt that evaluates whether the agent's response is successful.
            Should return True or False.
        success_examples:
          type: array
          items:
            $ref: '#/components/schemas/AgentSuccessfulResponseExample'
          description: >-
            Non-empty list of example responses that should be considered
            successful
        failure_examples:
          type: array
          items:
            $ref: '#/components/schemas/AgentFailureResponseExample'
          description: >-
            Non-empty list of example responses that should be considered
            failures
        tool_call_parameters:
          oneOf:
            - $ref: '#/components/schemas/UnitTestToolCallEvaluationModel-Output'
            - type: 'null'
          description: >-
            How to evaluate the agent's tool call (if any). If empty, the tool
            call is not evaluated.
        dynamic_variables:
          type: object
          additionalProperties:
            oneOf:
              - $ref: '#/components/schemas/GetUnitTestResponseModelDynamicVariables'
              - type: 'null'
          description: Dynamic variables to replace in the agent config during testing
        type:
          $ref: '#/components/schemas/UnitTestCommonModelType'
        from_conversation_metadata:
          oneOf:
            - $ref: '#/components/schemas/TestFromConversationMetadata-Output'
            - type: 'null'
          description: >-
            Metadata of a conversation this test was created from (if
            applicable).
        id:
          type: string
        name:
          type: string
      required:
        - chat_history
        - success_condition
        - success_examples
        - failure_examples
        - id
        - name

```

## SDK Code Examples

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

async function main() {
    const client = new ElevenLabsClient({
        environment: "https://api.elevenlabs.io",
    });
    await client.conversationalAi.tests.get("test_id");
}
main();

```

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    base_url="https://api.elevenlabs.io"
)

client.conversational_ai.tests.get(
    test_id="test_id"
)

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.elevenlabs.io/v1/convai/agent-testing/test_id"

	req, _ := http.NewRequest("GET", url, nil)

	req.Header.Add("xi-api-key", "xi-api-key")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.elevenlabs.io/v1/convai/agent-testing/test_id")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["xi-api-key"] = 'xi-api-key'

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.get("https://api.elevenlabs.io/v1/convai/agent-testing/test_id")
  .header("xi-api-key", "xi-api-key")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.elevenlabs.io/v1/convai/agent-testing/test_id', [
  'headers' => [
    'xi-api-key' => 'xi-api-key',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.elevenlabs.io/v1/convai/agent-testing/test_id");
var request = new RestRequest(Method.GET);
request.AddHeader("xi-api-key", "xi-api-key");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["xi-api-key": "xi-api-key"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.elevenlabs.io/v1/convai/agent-testing/test_id")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"
request.allHTTPHeaderFields = headers

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```