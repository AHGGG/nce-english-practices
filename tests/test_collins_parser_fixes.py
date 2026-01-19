
import pytest
from bs4 import BeautifulSoup
from app.services.collins_parser import collins_parser

class TestCollinsParserFixes:
    
    def test_extract_cross_reference(self):
        """Test extraction of cross-reference target."""
        html = """
        <div class="collins_content"> 
            <div class="collins_en_cn"> 
                <div class="caption"> 
                    <span class="num">1</span> 
                    <span class="text_gray" style="font-weight:bold;">→see: </span> 
                    <b class="text_blue"><a class="explain" href="entry://unequivocal#unequivocally">unequivocal</a></b>; 
                    <span class="text_blue"></span>
                </div> 
                <ul></ul>
            </div>
        </div>
        """
        soup = BeautifulSoup(html, "html.parser")
        target = collins_parser._extract_cross_reference(soup)
        assert target == "unequivocal"

    def test_extract_cross_reference_plain_text(self):
        """Test extraction of cross-reference defined as plain text."""
        html = """
        <div class="collins_content"> 
            <div class="collins_en_cn"> 
                <div class="caption"> 
                    <span class="text_gray">→see: </span> 
                    <a class="explain">simple_word</a>
                </div> 
            </div>
        </div>
        """
        soup = BeautifulSoup(html, "html.parser")
        target = collins_parser._extract_cross_reference(soup)
        assert target == "simple_word"
        
    def test_sense_index_starts_at_one(self):
        """Test that sense index defaults to 1 if missing or 0."""
        # HTML with no num element
        html = """
        <div class="word_entry">
            <span class="word_key">test</span>
        </div>
        <div class="collins_content">
            <div class="collins_en_cn example">
                <div class="caption">
                    <span class="st">ADJ</span>
                    Example definition.
                </div>
            </div>
        </div>
        """
        result = collins_parser.parse(html, "test")
        assert result.found is True
        assert len(result.entry.senses) == 1
        assert result.entry.senses[0].index == 1  # Should be 1, not 0
