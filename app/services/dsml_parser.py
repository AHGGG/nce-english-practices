import re
import json

class DSMLParser:
    @staticmethod
    def parse(text: str) -> list[dict]:
        """
        Parses DeepSeek XML-style tool calls from text.
        Format:
        <｜DSML｜invoke name="tool_name">
            <｜DSML｜parameter name="arg1" type="string">value</｜DSML｜parameter>
            ...
        </｜DSML｜invoke>
        """
        tools = []
        # Regex to find invoke blocks
        invoke_pattern = r"<｜DSML｜invoke name=\"(.*?)\">(.*?)</｜DSML｜invoke>"
        matches = re.findall(invoke_pattern, text, re.DOTALL)
        
        for tool_name, body in matches:
            args = {}
            # Regex to find parameters inside invoke block
            # Handling basic types. DeepSeek usually puts JSON-like structures in text content or simple strings.
            # Example: <｜DSML｜parameter name="words" string="true">["a", "b"]</｜DSML｜parameter>
            
            # Simple parameter extraction (basic support for string/json content)
            param_pattern = r"<｜DSML｜parameter name=\"(.*?)\".*?>(.*?)</｜DSML｜parameter>"
            params = re.findall(param_pattern, body, re.DOTALL)
            
            for param_name, param_value in params:
                # Try to parse as JSON if it looks like array/dict, else string
                try:
                    args[param_name] = json.loads(param_value)
                except json.JSONDecodeError:
                    args[param_name] = param_value
            
            tools.append({
                "name": tool_name,
                "arguments": args
            })
            
        return tools

    @staticmethod
    def stripr_dsml(text: str) -> str:
        """Removes DSML blocks from text."""
        wrapper_pattern = r"<｜DSML｜function_calls>.*?</｜DSML｜function_calls>"
        text = re.sub(wrapper_pattern, "", text, flags=re.DOTALL)
        return text.strip()
