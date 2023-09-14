# frozen_string_literal: true

require "json"
require "sinatra"

require "parser/current"
require "ruby_parser"
require "syntax_tree"
require "yarp"

def pp_object(object)
  PP.pp(object, +"", 79)
end

def parse(code, types)
  types.to_h do |type|
    parsed =
      case type
      in "P"   then Parser::CurrentRuby.parse(code)
      in "PL"
        buffer = Parser::Source::Buffer.new("(eval)", 1)
        buffer.source = code

        lexer = Parser::Lexer.new(32)
        lexer.source_buffer = buffer

        tokens = []
        token = nil

        tokens << token until ((token = lexer.advance) in [false, *])
        pp_object(tokens)
      in "RL"  then pp_object(Ripper.lex(code))
      in "RSR" then pp_object(Ripper.sexp_raw(code))
      in "RS"  then pp_object(Ripper.sexp(code))
      in "RP"  then pp_object(RubyParser.new.parse(code))
      in "RVA" then pp_object(RubyVM::AbstractSyntaxTree.parse(code))
      in "ST"  then pp_object(SyntaxTree.parse(code))
      in "Y"   then YARP.parse(code).value.inspect
      in "YL"  then pp_object(YARP.lex(code).value)
      end

    [type, parsed]
  rescue
    [type, $!.message]
  end
end

before do
  response.headers["Access-Control-Allow-Origin"] = "*"
end

post "/" do
  request.body.rewind

  case JSON.parse(request.body.read, symbolize_names: true)
  in { code:, types: }
    JSON.dump(parse(code, types & %w[P PL RL RSR RS RP RVA P RP ST Y YL]))
  else
    status 400
  end
end
